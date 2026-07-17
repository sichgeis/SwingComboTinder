import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { getImageEnvironment, loadEnvironment } from "./environment";
import {
  ContentConflictError,
  ContentValidationError,
  figureMetadataOptions,
  figureDefinitionFromContent,
  readFigureContentFile,
  saveFigureContentFile,
  validateFigureContent
} from "./content";
import { generateFigure } from "./generate";
import { createLogger, type Logger } from "./logger";
import { versionedMediaUrl } from "./media";
import { figuresRoot, repositoryRoot } from "./paths";
import { mapWithConcurrency } from "./pool";
import { planGeneration } from "./plan";
import { promoteCandidate, setImageApproved, setNeedsRework } from "./promote";
import { buildPrompt, MAX_GENERATION_NOTE_LENGTH } from "./prompt";
import {
  addTeachingPose,
  discoverFigures,
  findFigure,
  MAX_TEACHING_POSE_UPLOAD_BYTES,
  setGenerationNote,
  swapTeachingPose
} from "./repository";
import {
  generationModes,
  imageQualities,
  type GenerationMode,
  type ImageQuality,
  type SelectionOptions
} from "./types";
import { renderCardMarkup } from "../../src/ui/card-presentation";
import { createFigurePackage, FigureCreationError } from "./create-figure";
import { importYouTubeTranscript, listTranscriptFiles } from "./transcripts";

const staticRoot = resolve(dirname(fileURLToPath(import.meta.url)), "static");
const appStylesPath = resolve(repositoryRoot, "src/styles/app.css");
const logger = createLogger("image-studio");
const environment = (() => {
  try {
    loadEnvironment();
    return getImageEnvironment();
  } catch (error) {
    logger.error("configuration-failed", { error });
    throw error;
  }
})();
const port = environment.studioPort;
const model = environment.model;
const clients = new Set<ServerResponse>();
const transcriptImports = new Set<string>();
let runActive = false;

interface RunRequest {
  readonly mode: GenerationMode;
  readonly style?: string;
  readonly ids?: readonly string[];
  readonly quality: ImageQuality;
  readonly count: number;
  readonly concurrency: number;
}

const sendJson = (response: ServerResponse, status: number, payload: unknown): void => {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(payload));
};

const readJson = async (request: IncomingMessage): Promise<unknown> => {
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk as Uint8Array);
    size += buffer.length;
    if (size > 1_000_000) throw new Error("Request body is too large.");
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
};

const readImage = async (request: IncomingMessage): Promise<Buffer> => {
  const declaredSize = Number(request.headers["content-length"] ?? 0);
  if (Number.isFinite(declaredSize) && declaredSize > MAX_TEACHING_POSE_UPLOAD_BYTES) {
    throw new Error("Teaching poses must be no larger than 20 MB.");
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk as Uint8Array);
    size += buffer.length;
    if (size > MAX_TEACHING_POSE_UPLOAD_BYTES) {
      throw new Error("Teaching poses must be no larger than 20 MB.");
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
};

const uploadedFilename = (header: string | readonly string[] | undefined): string => {
  const value = typeof header === "string" ? header : header?.[0];
  if (!value) return "uploaded-pose";
  try {
    return decodeURIComponent(value);
  } catch {
    return "uploaded-pose";
  }
};

const event = (type: string, payload: Record<string, unknown> = {}): void => {
  logger.debug("event-broadcast", { type, clients: clients.size, payload });
  const message = `event: ${type}\ndata: ${JSON.stringify({ type, ...payload })}\n\n`;
  for (const client of clients) client.write(message);
};

const contentSummaryFor = async (figure: Awaited<ReturnType<typeof findFigure>>): Promise<Record<string, unknown>> => {
  try {
    const { content } = await readFigureContentFile(figure.definitionPath, figure.slug);
    return {
      name: content.basics.name,
      publication: content.publication,
      contentValid: true,
      germanComplete: true,
      resourceCount: content.cardResources.length
    };
  } catch (error) {
    return {
      name: figure.name,
      publication: null,
      contentValid: false,
      germanComplete: false,
      resourceCount: 0,
      contentError: error instanceof Error ? error.message : String(error)
    };
  }
};

const serializeFigures = async (): Promise<unknown> =>
  Promise.all((await discoverFigures()).map(async (figure) => {
    const contentSummary = await contentSummaryFor(figure);
    const poseOptions = await Promise.all(figure.poseOptions.map(async (option) => ({
      path: option.relativePath,
      filename: option.filename,
      selected: option.selected,
      url: await versionedMediaUrl(option.absolutePath)
    })));
    const currentUrl = figure.hasCurrent
      ? await versionedMediaUrl(figure.currentPath)
      : figure.hasFallback
        ? await versionedMediaUrl(figure.fallbackPath)
        : null;
    return {
      id: figure.id,
      style: figure.style,
      slug: figure.slug,
      ...contentSummary,
      marked: figure.marked,
      imageApproved: figure.imageApproved,
      hasPose: figure.hasPose,
      hasCurrent: figure.hasCurrent,
      poseDirection: figure.poseDirection,
      characterDirection: figure.characterDirection,
      generationNote: figure.generationNote,
      poseUrl: poseOptions.find((option) => option.selected)?.url ?? null,
      poseOptions,
      currentUrl,
      currentIsFallback: !figure.hasCurrent && figure.hasFallback,
      candidates: await Promise.all(figure.candidates.map(async (candidate) => ({
        path: relative(figure.directory, candidate.absolutePath).split("\\").join("/"),
        url: await versionedMediaUrl(candidate.absolutePath),
        createdAt: candidate.createdAt,
        runId: candidate.runId
      })))
    };
  }));

const parseRunRequest = (value: unknown): RunRequest => {
  if (typeof value !== "object" || value === null) throw new Error("Expected a JSON object.");
  const body = value as Record<string, unknown>;
  const mode = body.mode;
  const quality = body.quality ?? "medium";
  const count = Number(body.count ?? 1);
  const concurrency = Number(body.concurrency ?? 3);
  if (typeof mode !== "string" || !generationModes.includes(mode as GenerationMode)) {
    throw new Error("Invalid generation mode.");
  }
  if (typeof quality !== "string" || !imageQualities.includes(quality as ImageQuality)) {
    throw new Error("Invalid image quality.");
  }
  if (!Number.isInteger(count) || count < 1 || count > 4) {
    throw new Error("Candidate count must be 1–4.");
  }
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 6) {
    throw new Error("Concurrency must be 1–6.");
  }
  const style = typeof body.style === "string" && body.style ? body.style : undefined;
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((id): id is string => typeof id === "string")
    : undefined;
  return {
    mode: mode as GenerationMode,
    ...(style === undefined ? {} : { style }),
    ...(ids === undefined ? {} : { ids }),
    quality: quality as ImageQuality,
    count,
    concurrency
  };
};

const runGeneration = async (request: RunRequest): Promise<void> => {
  const runId = randomUUID();
  const runLogger = logger.child({ runId });
  const startedAt = Date.now();
  runActive = true;
  const selection: SelectionOptions = {
    mode: request.mode,
    ...(request.style === undefined ? {} : { style: request.style }),
    ...(request.ids === undefined ? {} : { ids: request.ids })
  };
  runLogger.info("run-started", {
    mode: request.mode,
    style: request.style,
    ids: request.ids,
    quality: request.quality,
    count: request.count,
    concurrency: request.concurrency,
    imageApiProvider: environment.imageApiProvider,
    model,
    size: environment.imageSize
  });
  try {
    const plan = planGeneration(await discoverFigures(), selection);
    runLogger.info("run-planned", {
      ready: plan.ready.length,
      blocked: plan.blocked.length,
      readyIds: plan.ready.map((figure) => figure.id),
      blockedIds: plan.blocked.map((figure) => figure.id)
    });
    event("run-started", { ready: plan.ready.length, blocked: plan.blocked.length });
    for (const figure of plan.blocked) {
      event("job-blocked", {
        id: figure.id,
        message: "Missing teaching-frames/selected.png"
      });
    }
    await mapWithConcurrency(plan.ready, request.concurrency, async (figure) => {
      const jobLogger = runLogger.child({ figureId: figure.id });
      const jobStartedAt = Date.now();
      jobLogger.info("job-started");
      event("job-started", { id: figure.id });
      try {
        const result = await generateFigure(figure, {
          model,
          quality: request.quality,
          size: environment.imageSize,
          count: request.count,
          timeoutMs: environment.requestTimeoutMs
        }, {
          apiKey: environment.imageApiKey,
          baseUrl: environment.imageApiBaseUrl,
          provider: environment.imageApiProvider
        });
        event("job-completed", {
          id: figure.id,
          candidates: result.candidates.length,
          durationMs: result.durationMs,
          requestId: result.requestId
        });
        jobLogger.info("job-completed", {
          candidateRunId: result.runId,
          candidates: result.candidates.length,
          requestId: result.requestId,
          durationMs: Date.now() - jobStartedAt,
          usage: result.usage
        });
      } catch (error) {
        jobLogger.error("job-failed", { durationMs: Date.now() - jobStartedAt, error });
        event("job-failed", {
          id: figure.id,
          message: error instanceof Error ? error.message : String(error)
        });
      }
    });
    event("run-completed");
    runLogger.info("run-completed", { durationMs: Date.now() - startedAt });
  } catch (error) {
    runLogger.error("run-failed", { durationMs: Date.now() - startedAt, error });
    event("run-failed", { message: error instanceof Error ? error.message : String(error) });
  } finally {
    runActive = false;
    runLogger.debug("run-state-cleared");
  }
};

const serveStatic = async (response: ServerResponse, path: string): Promise<void> => {
  const filename = path === "/" ? "index.html" : path.slice(1);
  const absolutePath = resolve(staticRoot, filename);
  if (!absolutePath.startsWith(`${staticRoot}${sep}`) && absolutePath !== resolve(staticRoot, "index.html")) {
    sendJson(response, 403, { error: "Forbidden" });
    return;
  }
  const contentTypes: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8"
  };
  const content = await readFile(absolutePath);
  response.writeHead(200, {
    "content-type": contentTypes[extname(absolutePath)] ?? "application/octet-stream",
    "cache-control": "no-store"
  });
  response.end(content);
};

const serveMedia = async (response: ServerResponse, path: string | null): Promise<void> => {
  if (!path) throw new Error("Missing media path.");
  const absolutePath = resolve(repositoryRoot, path);
  if (!absolutePath.startsWith(`${figuresRoot}${sep}`)) throw new Error("Invalid media path.");
  await stat(absolutePath);
  const contentTypes: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp"
  };
  response.writeHead(200, {
    "content-type": contentTypes[extname(absolutePath).toLowerCase()] ?? "application/octet-stream",
    "cache-control": "no-store"
  });
  response.end(await readFile(absolutePath));
};

const figureImageUrl = async (figure: Awaited<ReturnType<typeof findFigure>>): Promise<string> =>
  figure.hasCurrent
    ? versionedMediaUrl(figure.currentPath)
    : figure.hasFallback
      ? versionedMediaUrl(figure.fallbackPath)
      : "";

const serveFigureContent = async (response: ServerResponse, id: string | null): Promise<void> => {
  if (!id) throw new Error("Missing figure ID.");
  const figure = await findFigure(id);
  const loaded = await readFigureContentFile(figure.definitionPath, figure.slug);
  sendJson(response, 200, {
    ...loaded,
    imageUrl: await figureImageUrl(figure),
    metadataOptions: figureMetadataOptions,
    transcripts: await listTranscriptFiles(figure)
  });
};

const saveFigureContent = async (
  request: IncomingMessage,
  response: ServerResponse,
  requestLogger: Logger
): Promise<void> => {
  const body = await readJson(request);
  if (typeof body !== "object" || body === null) throw new Error("Expected a JSON object.");
  const values = body as Record<string, unknown>;
  if (typeof values.id !== "string" || typeof values.revision !== "string") {
    throw new Error("Saving content requires figure id and source revision.");
  }
  const figure = await findFigure(values.id);
  const current = await readFigureContentFile(figure.definitionPath, figure.slug);
  const saved = await saveFigureContentFile(
    figure.definitionPath,
    current.content.identity,
    values.revision,
    values.content
  );
  requestLogger.info("figure-content-saved", { figureId: values.id, revision: saved.revision });
  event("figure-updated", { id: values.id });
  sendJson(response, 200, { ...saved, imageUrl: await figureImageUrl(figure) });
};

const serveFigurePreview = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
  const body = await readJson(request);
  if (typeof body !== "object" || body === null) throw new Error("Expected a JSON object.");
  const values = body as Record<string, unknown>;
  if (typeof values.id !== "string" || (values.language !== "en" && values.language !== "de")) {
    throw new Error("Preview requires figure id and language.");
  }
  const figure = await findFigure(values.id);
  const content = validateFigureContent(values.content);
  const imageUrl = await figureImageUrl(figure);
  sendJson(response, 200, {
    markup: renderCardMarkup({
      figure: figureDefinitionFromContent(content, imageUrl),
      language: values.language,
      index: Math.max(0, content.identity.order - 1),
      imageUrl
    })
  });
};

const handleRequest = async (
  request: IncomingMessage,
  response: ServerResponse,
  requestLogger: Logger
): Promise<void> => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  if (request.method === "GET" && url.pathname === "/api/config") {
    sendJson(response, 200, {
      model,
      imageSize: environment.imageSize,
      imageQuality: environment.imageQuality,
      imageApiProvider: environment.imageApiProvider,
      imageApiConfigured: Boolean(environment.imageApiKey && environment.imageApiBaseUrl),
      runActive
    });
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/figures") {
    sendJson(response, 200, await serializeFigures());
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/figures") {
    const created = await createFigurePackage(await readJson(request));
    requestLogger.info("figure-created", { figureId: created.id });
    event("figure-updated", { id: created.id });
    sendJson(response, 201, {
      id: created.id,
      content: created.loaded.content,
      revision: created.loaded.revision,
      metadataOptions: figureMetadataOptions
    });
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/figure-content") {
    await serveFigureContent(response, url.searchParams.get("id"));
    return;
  }
  if (request.method === "PUT" && url.pathname === "/api/figure-content") {
    await saveFigureContent(request, response, requestLogger);
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/preview") {
    await serveFigurePreview(request, response);
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/transcripts") {
    const body = await readJson(request);
    if (typeof body !== "object" || body === null) throw new Error("Expected a JSON object.");
    const values = body as Record<string, unknown>;
    if (typeof values.id !== "string" || typeof values.url !== "string") {
      throw new Error("Transcript download requires a figure id and YouTube URL.");
    }
    const importKey = values.id;
    if (transcriptImports.has(importKey)) throw new Error("Another transcript download is already running for this figure.");
    transcriptImports.add(importKey);
    try {
      const figure = await findFigure(values.id);
      const result = await importYouTubeTranscript(figure, values.url);
      requestLogger.info("transcript-imported", {
        figureId: values.id,
        videoId: result.videoId,
        filename: result.filename,
        status: result.status
      });
      event("figure-updated", { id: values.id });
      sendJson(response, result.status === "written" ? 201 : 200, {
        result,
        transcripts: await listTranscriptFiles(figure)
      });
    } finally {
      transcriptImports.delete(importKey);
    }
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/prompt") {
    const id = url.searchParams.get("id");
    if (!id) throw new Error("Missing figure ID.");
    const figure = await findFigure(id);
    sendJson(response, 200, { prompt: buildPrompt(figure.generationNote) });
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/events") {
    response.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive"
    });
    response.write(`event: connected\ndata: ${JSON.stringify({ type: "connected" })}\n\n`);
    clients.add(response);
    requestLogger.info("event-client-connected", { clients: clients.size });
    request.on("close", () => {
      clients.delete(response);
      requestLogger.info("event-client-disconnected", { clients: clients.size });
    });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/runs") {
    if (runActive) {
      sendJson(response, 409, { error: "A generation run is already active." });
      return;
    }
    const runRequest = parseRunRequest(await readJson(request));
    requestLogger.info("generation-run-accepted", {
      mode: runRequest.mode,
      style: runRequest.style,
      ids: runRequest.ids,
      quality: runRequest.quality,
      count: runRequest.count,
      concurrency: runRequest.concurrency
    });
    sendJson(response, 202, { accepted: true });
    void runGeneration(runRequest);
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/promote") {
    const body = await readJson(request);
    if (typeof body !== "object" || body === null) throw new Error("Expected a JSON object.");
    const values = body as Record<string, unknown>;
    if (typeof values.id !== "string" || typeof values.path !== "string") {
      throw new Error("Promotion requires figure id and candidate path.");
    }
    await promoteCandidate(await findFigure(values.id), values.path);
    requestLogger.info("candidate-promoted", { figureId: values.id, candidatePath: values.path });
    event("figure-updated", { id: values.id });
    sendJson(response, 200, { promoted: true });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/mark") {
    const body = await readJson(request);
    if (typeof body !== "object" || body === null) throw new Error("Expected a JSON object.");
    const values = body as Record<string, unknown>;
    if (typeof values.id !== "string" || typeof values.marked !== "boolean") {
      throw new Error("Marking requires figure id and marked state.");
    }
    await setNeedsRework(await findFigure(values.id), values.marked);
    requestLogger.info("figure-mark-updated", { figureId: values.id, marked: values.marked });
    event("figure-updated", { id: values.id });
    sendJson(response, 200, { marked: values.marked });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/image-approval") {
    const body = await readJson(request);
    if (typeof body !== "object" || body === null) throw new Error("Expected a JSON object.");
    const values = body as Record<string, unknown>;
    if (typeof values.id !== "string" || typeof values.approved !== "boolean") {
      throw new Error("Image approval requires figure id and approved state.");
    }
    await setImageApproved(await findFigure(values.id), values.approved);
    requestLogger.info("image-approval-updated", { figureId: values.id, approved: values.approved });
    event("figure-updated", { id: values.id });
    sendJson(response, 200, { approved: values.approved });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/generation-note") {
    const body = await readJson(request);
    if (typeof body !== "object" || body === null) throw new Error("Expected a JSON object.");
    const values = body as Record<string, unknown>;
    if (typeof values.id !== "string" || typeof values.note !== "string") {
      throw new Error("Saving a generation note requires figure id and note text.");
    }
    if (values.note.trim().length > MAX_GENERATION_NOTE_LENGTH) {
      throw new Error(`Generation note must be at most ${MAX_GENERATION_NOTE_LENGTH} characters.`);
    }
    const figure = await findFigure(values.id);
    await setGenerationNote(figure, values.note);
    requestLogger.info("generation-note-saved", {
      figureId: values.id,
      characters: values.note.trim().length
    });
    event("figure-updated", { id: values.id });
    sendJson(response, 200, { saved: true, note: values.note.trim() });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/teaching-pose") {
    const body = await readJson(request);
    if (typeof body !== "object" || body === null) throw new Error("Expected a JSON object.");
    const values = body as Record<string, unknown>;
    if (typeof values.id !== "string" || typeof values.path !== "string") {
      throw new Error("Teaching pose selection requires figure id and alternate path.");
    }
    const figure = await findFigure(values.id);
    await swapTeachingPose(figure, values.path);
    requestLogger.info("teaching-pose-swapped", { figureId: values.id, alternatePath: values.path });
    event("figure-updated", { id: values.id });
    sendJson(response, 200, { swapped: true });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/teaching-pose-upload") {
    const id = url.searchParams.get("id");
    if (!id) throw new Error("Teaching pose upload requires a figure id.");
    const contentType = request.headers["content-type"] ?? "";
    const added = await addTeachingPose(
      await findFigure(id),
      await readImage(request),
      uploadedFilename(request.headers["x-file-name"]),
      contentType
    );
    requestLogger.info("teaching-pose-uploaded", { figureId: id, filename: added.filename, selected: added.selected });
    event("figure-updated", { id });
    sendJson(response, 201, { added });
    return;
  }
  if (request.method === "GET" && url.pathname === "/media") {
    await serveMedia(response, url.searchParams.get("path"));
    return;
  }
  if (request.method === "GET" && url.pathname === "/app-card.css") {
    response.writeHead(200, { "content-type": "text/css; charset=utf-8", "cache-control": "no-store" });
    response.end(await readFile(appStylesPath));
    return;
  }
  if (request.method === "GET" && ["/", "/app.js", "/content-workspace.js", "/refresh-coordinator.js", "/styles.css"].includes(url.pathname)) {
    await serveStatic(response, url.pathname);
    return;
  }
  sendJson(response, 404, { error: "Not found" });
};

const server = createServer((request, response) => {
  const requestId = randomUUID().slice(0, 8);
  const startedAt = Date.now();
  const requestLogger = logger.child({
    requestId,
    method: request.method ?? "UNKNOWN",
    path: new URL(request.url ?? "/", "http://localhost").pathname
  });
  requestLogger.debug("request-started", {
    remoteAddress: request.socket.remoteAddress,
    userAgent: request.headers["user-agent"]
  });
  response.on("finish", () => {
    requestLogger.debug("request-completed", {
      status: response.statusCode,
      durationMs: Date.now() - startedAt
    });
  });
  handleRequest(request, response, requestLogger).catch((error: unknown) => {
    requestLogger.error("request-failed", {
      status: response.headersSent ? response.statusCode : 400,
      durationMs: Date.now() - startedAt,
      error
    });
    if (!response.headersSent) {
      const status = error instanceof ContentConflictError ? 409 : error instanceof ContentValidationError ? 422 : 400;
      sendJson(response, status, {
        error: error instanceof Error ? error.message : String(error),
        ...(error instanceof ContentValidationError || error instanceof FigureCreationError ? { issues: error.issues } : {})
      });
    } else {
      response.end();
    }
  });
});

server.on("clientError", (error, socket) => {
  logger.warn("client-error", { socketDestroyed: socket.destroyed, error });
});

server.on("error", (error) => {
  logger.error("server-error", { port, error });
});

server.listen(port, "127.0.0.1", () => {
  logger.info("listening", {
    url: `http://127.0.0.1:${port}`,
    model,
    size: environment.imageSize,
    quality: environment.imageQuality,
    timeoutMs: environment.requestTimeoutMs,
    logLevel: environment.logLevel,
    imageApiProvider: environment.imageApiProvider,
    imageApiConfigured: Boolean(environment.imageApiKey && environment.imageApiBaseUrl)
  });
  console.log(`Swing Thing Content Studio: http://127.0.0.1:${port}`);
  if (!environment.imageApiKey || !environment.imageApiBaseUrl) {
    logger.warn("image-api-not-configured", {
      provider: environment.imageApiProvider,
      credentialConfigured: Boolean(environment.imageApiKey),
      baseUrlConfigured: Boolean(environment.imageApiBaseUrl)
    });
    const required = environment.imageApiProvider === "openai"
      ? "OPENAI_API_KEY"
      : "LITELLM_API_KEY and LITELLM_BASE_URL";
    console.log(`${required} are not set; browsing and dry planning still work.`);
  }
});
