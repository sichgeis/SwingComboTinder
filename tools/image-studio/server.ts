import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { getImageEnvironment, loadEnvironment } from "./environment";
import { generateFigure } from "./generate";
import { figuresRoot, repositoryRoot } from "./paths";
import { mapWithConcurrency } from "./pool";
import { planGeneration } from "./plan";
import { promoteCandidate, setNeedsRework } from "./promote";
import { buildPrompt } from "./prompt";
import { discoverFigures, findFigure } from "./repository";
import {
  generationModes,
  imageQualities,
  type GenerationMode,
  type ImageQuality,
  type SelectionOptions
} from "./types";

const staticRoot = resolve(dirname(fileURLToPath(import.meta.url)), "static");
loadEnvironment();
const environment = getImageEnvironment();
const port = environment.studioPort;
const model = environment.model;
const clients = new Set<ServerResponse>();
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
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
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

const event = (type: string, payload: Record<string, unknown> = {}): void => {
  const message = `event: ${type}\ndata: ${JSON.stringify({ type, ...payload })}\n\n`;
  for (const client of clients) client.write(message);
};

const mediaUrl = (path: string): string =>
  `/media?path=${encodeURIComponent(relative(repositoryRoot, path).split("\\").join("/"))}`;

const serializeFigures = async (): Promise<unknown> =>
  (await discoverFigures()).map((figure) => ({
    id: figure.id,
    style: figure.style,
    slug: figure.slug,
    name: figure.name,
    marked: figure.marked,
    hasPose: figure.hasPose,
    hasCurrent: figure.hasCurrent,
    poseDirection: figure.poseDirection,
    characterDirection: figure.characterDirection,
    poseUrl: figure.hasPose ? mediaUrl(figure.posePath) : null,
    currentUrl: figure.hasCurrent
      ? mediaUrl(figure.currentPath)
      : figure.hasFallback
        ? mediaUrl(figure.fallbackPath)
        : null,
    currentIsFallback: !figure.hasCurrent && figure.hasFallback,
    candidates: figure.candidates.map((candidate) => ({
      path: relative(figure.directory, candidate.absolutePath).split("\\").join("/"),
      url: mediaUrl(candidate.absolutePath),
      createdAt: candidate.createdAt,
      runId: candidate.runId
    }))
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
  runActive = true;
  const selection: SelectionOptions = {
    mode: request.mode,
    ...(request.style === undefined ? {} : { style: request.style }),
    ...(request.ids === undefined ? {} : { ids: request.ids })
  };
  try {
    const plan = planGeneration(await discoverFigures(), selection);
    event("run-started", { ready: plan.ready.length, blocked: plan.blocked.length });
    for (const figure of plan.blocked) {
      event("job-blocked", {
        id: figure.id,
        message: "Missing teaching-frames/selected.png"
      });
    }
    await mapWithConcurrency(plan.ready, request.concurrency, async (figure) => {
      event("job-started", { id: figure.id });
      try {
        const result = await generateFigure(figure, {
          model,
          quality: request.quality,
          size: environment.imageSize,
          count: request.count,
          timeoutMs: environment.requestTimeoutMs
        }, environment.apiKey);
        event("job-completed", {
          id: figure.id,
          candidates: result.candidates.length,
          durationMs: result.durationMs,
          requestId: result.requestId
        });
      } catch (error) {
        event("job-failed", {
          id: figure.id,
          message: error instanceof Error ? error.message : String(error)
        });
      }
    });
    event("run-completed");
  } catch (error) {
    event("run-failed", { message: error instanceof Error ? error.message : String(error) });
  } finally {
    runActive = false;
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
  response.writeHead(200, { "content-type": contentTypes[extname(absolutePath)] ?? "application/octet-stream" });
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

const handleRequest = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  if (request.method === "GET" && url.pathname === "/api/config") {
    sendJson(response, 200, {
      model,
      imageSize: environment.imageSize,
      imageQuality: environment.imageQuality,
      apiKeyConfigured: Boolean(environment.apiKey),
      runActive
    });
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/figures") {
    sendJson(response, 200, await serializeFigures());
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/prompt") {
    const id = url.searchParams.get("id");
    if (!id) throw new Error("Missing figure ID.");
    sendJson(response, 200, { prompt: await buildPrompt(await findFigure(id)) });
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
    request.on("close", () => clients.delete(response));
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/runs") {
    if (runActive) {
      sendJson(response, 409, { error: "A generation run is already active." });
      return;
    }
    const runRequest = parseRunRequest(await readJson(request));
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
    event("figure-updated", { id: values.id });
    sendJson(response, 200, { marked: values.marked });
    return;
  }
  if (request.method === "GET" && url.pathname === "/media") {
    await serveMedia(response, url.searchParams.get("path"));
    return;
  }
  if (request.method === "GET" && ["/", "/app.js", "/styles.css"].includes(url.pathname)) {
    await serveStatic(response, url.pathname);
    return;
  }
  sendJson(response, 404, { error: "Not found" });
};

const server = createServer((request, response) => {
  handleRequest(request, response).catch((error: unknown) => {
    if (!response.headersSent) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
    } else {
      response.end();
    }
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Dance Card Image Studio: http://127.0.0.1:${port}`);
  if (!environment.apiKey) {
    console.log("OPENAI_API_KEY is not set; browsing and dry planning work, generation does not.");
  }
});
