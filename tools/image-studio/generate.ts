import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, relative, resolve } from "node:path";

import sharp from "sharp";

import { createLogger, type Logger } from "./logger";
import { repositoryRoot, styleReferencePaths } from "./paths";
import { buildPrompt, hashText } from "./prompt";
import type {
  CandidateImage,
  FigureRecord,
  GeneratedCandidateSet,
  GenerationOptions,
  LiteLLMConnection,
  TokenUsage
} from "./types";

interface InputMetadata {
  readonly path: string;
  readonly sha256: string;
  readonly bytes: number;
  readonly width?: number;
  readonly height?: number;
}

interface LiteLLMImageResult {
  readonly b64_json?: string;
  readonly url?: string;
}

interface LiteLLMUsage {
  readonly input_tokens: number;
  readonly input_tokens_details: { readonly image_tokens: number; readonly text_tokens: number };
  readonly output_tokens: number;
  readonly total_tokens: number;
}

interface LiteLLMResponse {
  readonly data: readonly LiteLLMImageResult[];
  readonly usage?: LiteLLMUsage;
}

const hashFile = async (path: string): Promise<string> =>
  createHash("sha256").update(await readFile(path)).digest("hex");

const describeInput = async (path: string): Promise<InputMetadata> => {
  const [details, image] = await Promise.all([stat(path), sharp(path).metadata()]);
  return {
    path: relative(repositoryRoot, path).split("\\").join("/"),
    sha256: await hashFile(path),
    bytes: details.size,
    ...(image.width === undefined ? {} : { width: image.width }),
    ...(image.height === undefined ? {} : { height: image.height })
  };
};

const prepareInput = async (path: string): Promise<Buffer> =>
  sharp(path)
    .rotate()
    .resize({ width: 1536, height: 1536, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 90 })
    .toBuffer();

const safeUrl = (value: string): string => {
  try {
    const url = new URL(value);
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return "[invalid URL]";
  }
};

const parseLiteLLMResponse = (value: unknown): LiteLLMResponse => {
  if (typeof value !== "object" || value === null) {
    throw new Error("LiteLLM returned an unexpected response shape.");
  }
  const response = value as Record<string, unknown>;
  if (!Array.isArray(response.data)) {
    throw new Error("LiteLLM returned an unexpected response shape.");
  }
  const data = response.data.map((item) => {
    if (typeof item !== "object" || item === null) {
      throw new Error("LiteLLM returned an invalid image result.");
    }
    const result = item as Record<string, unknown>;
    return {
      ...(typeof result.b64_json === "string" ? { b64_json: result.b64_json } : {}),
      ...(typeof result.url === "string" ? { url: result.url } : {})
    };
  });
  return {
    data,
    ...(typeof response.usage === "object" && response.usage !== null
      ? { usage: response.usage as LiteLLMUsage }
      : {})
  };
};

const postWithRetries = async (
  url: string,
  apiKey: string,
  body: FormData,
  timeoutMs: number,
  logger: Logger
): Promise<Response> => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const startedAt = Date.now();
    logger.debug("proxy-request-attempt", { attempt: attempt + 1, timeoutMs });
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}` },
        body,
        signal: AbortSignal.timeout(timeoutMs)
      });
      const retryable = response.status === 429 || response.status >= 500;
      logger.info("proxy-response", {
        attempt: attempt + 1,
        status: response.status,
        statusText: response.statusText,
        requestId: response.headers.get("x-request-id"),
        contentType: response.headers.get("content-type"),
        durationMs: Date.now() - startedAt,
        retryable
      });
      if (!retryable || attempt === 2) return response;
    } catch (error) {
      logger.warn("proxy-request-error", {
        attempt: attempt + 1,
        durationMs: Date.now() - startedAt,
        willRetry: attempt < 2,
        error
      });
      if (attempt === 2) {
        throw new Error(`Could not reach LiteLLM proxy: ${String(error)}`, { cause: error });
      }
    }
    const retryDelayMs = 250 * 2 ** attempt;
    logger.warn("proxy-request-retrying", { attempt: attempt + 1, retryDelayMs });
    await new Promise((resolveDelay) => setTimeout(resolveDelay, retryDelayMs));
  }
  throw new Error("Could not reach LiteLLM proxy.");
};

const imageBytes = async (
  image: LiteLLMImageResult,
  timeoutMs: number,
  index: number,
  logger: Logger
): Promise<Buffer> => {
  if (image.b64_json) {
    const decoded = Buffer.from(image.b64_json, "base64");
    if (decoded.length === 0) throw new Error("LiteLLM returned invalid base64 image data.");
    logger.debug("candidate-decoded", { candidate: index + 1, source: "base64", bytes: decoded.length });
    return decoded;
  }
  if (image.url) {
    const startedAt = Date.now();
    logger.debug("candidate-download-started", {
      candidate: index + 1,
      url: safeUrl(image.url),
      timeoutMs
    });
    const response = await fetch(image.url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) throw new Error(`Could not download LiteLLM image result: HTTP ${response.status}.`);
    const downloaded = Buffer.from(await response.arrayBuffer());
    logger.info("candidate-downloaded", {
      candidate: index + 1,
      status: response.status,
      bytes: downloaded.length,
      durationMs: Date.now() - startedAt
    });
    return downloaded;
  }
  throw new Error("A LiteLLM image result contained neither b64_json nor url.");
};

const createRunId = (): string => {
  const timestamp = new Date().toISOString().replaceAll(":", "-").replace(".", "-");
  return `${timestamp}-${randomUUID().slice(0, 8)}`;
};

const normalizeUsage = (usage: {
  input_tokens: number;
  input_tokens_details: { image_tokens: number; text_tokens: number };
  output_tokens: number;
  total_tokens: number;
} | undefined): TokenUsage | undefined =>
  usage === undefined
    ? undefined
    : {
        inputTokens: usage.input_tokens,
        inputImageTokens: usage.input_tokens_details.image_tokens,
        inputTextTokens: usage.input_tokens_details.text_tokens,
        outputTokens: usage.output_tokens,
        totalTokens: usage.total_tokens
      };

export const generateFigure = async (
  figure: FigureRecord,
  options: GenerationOptions,
  connection: LiteLLMConnection
): Promise<GeneratedCandidateSet> => {
  const logger = createLogger("image-generation", { figureId: figure.id });
  if (!connection.apiKey || !connection.baseUrl) {
    logger.error("configuration-missing", {
      proxyKeyConfigured: Boolean(connection.apiKey),
      baseUrlConfigured: Boolean(connection.baseUrl)
    });
    throw new Error("LITELLM_API_KEY and LITELLM_BASE_URL must be set in .env or the shell.");
  }
  if (!figure.hasPose) throw new Error(`${figure.id} has no teaching-frames/selected.png.`);
  if (options.count < 1 || options.count > 4) throw new Error("Candidate count must be 1–4.");

  const operationStartedAt = Date.now();
  logger.info("started", {
    model: options.model,
    size: options.size,
    quality: options.quality,
    candidateCount: options.count,
    timeoutMs: options.timeoutMs,
    endpoint: safeUrl(`${connection.baseUrl}/v1/images/edits`)
  });
  const prompt = await buildPrompt(figure);
  logger.debug("prompt-built", { characters: prompt.length, sha256: hashText(prompt) });
  const inputPaths = [figure.posePath, ...styleReferencePaths];
  const preparationStartedAt = Date.now();
  const preparedInputs = await Promise.all(inputPaths.map(prepareInput));
  logger.info("inputs-prepared", {
    inputs: preparedInputs.map((buffer, index) => ({
      role: index === 0 ? "teaching-frame" : "style-reference",
      path: relative(repositoryRoot, inputPaths[index] ?? "").split("\\").join("/"),
      uploadBytes: buffer.length
    })),
    totalUploadBytes: preparedInputs.reduce((total, buffer) => total + buffer.length, 0),
    durationMs: Date.now() - preparationStartedAt
  });
  const request = new FormData();
  preparedInputs.forEach((buffer, index) => {
    const filename =
      index === 0
        ? "01-teaching-frame.webp"
        : `${String(index + 1).padStart(2, "0")}-style-reference.webp`;
    request.append("image", new Blob([new Uint8Array(buffer)], { type: "image/webp" }), filename);
  });
  request.set("model", options.model);
  request.set("prompt", prompt);
  request.set("n", String(options.count));
  request.set("size", options.size);
  request.set("quality", options.quality);

  const startedAt = Date.now();
  const proxyResponse = await postWithRetries(
    `${connection.baseUrl}/v1/images/edits`,
    connection.apiKey,
    request,
    options.timeoutMs,
    logger
  );
  const durationMs = Date.now() - startedAt;
  const requestId = proxyResponse.headers.get("x-request-id");
  if (!proxyResponse.ok) {
    const responseBody = (await proxyResponse.text()).slice(0, 2000);
    logger.error("proxy-response-failed", {
      status: proxyResponse.status,
      statusText: proxyResponse.statusText,
      requestId,
      durationMs,
      responseBody
    });
    throw new Error(
      `LiteLLM returned HTTP ${proxyResponse.status}: ${responseBody}`
    );
  }
  const response = parseLiteLLMResponse(await proxyResponse.json());
  if (response.data.length === 0) throw new Error("LiteLLM returned no image candidates.");
  logger.info("proxy-response-parsed", {
    candidates: response.data.length,
    requestId,
    durationMs,
    usage: normalizeUsage(response.usage)
  });
  const generatedImages = await Promise.all(
    response.data.map(async (image, index) => imageBytes(image, options.timeoutMs, index, logger))
  );

  const runId = createRunId();
  const runDirectory = resolve(figure.directory, "generated/candidates", runId);
  await mkdir(runDirectory, { recursive: true });
  const createdAt = new Date().toISOString();
  const candidates: CandidateImage[] = [];
  for (const [index, image] of generatedImages.entries()) {
    const absolutePath = resolve(runDirectory, `candidate-${index + 1}.png`);
    await writeFile(absolutePath, image);
    candidates.push({
      absolutePath,
      relativePath: relative(repositoryRoot, absolutePath).split("\\").join("/"),
      createdAt,
      runId
    });
    logger.debug("candidate-written", {
      candidate: index + 1,
      path: relative(repositoryRoot, absolutePath).split("\\").join("/"),
      bytes: image.length
    });
  }

  const usage = normalizeUsage(response.usage);
  const metadata = {
    schemaVersion: 1,
    figureId: figure.id,
    runId,
    createdAt,
    model: options.model,
    size: options.size,
    quality: options.quality,
    candidateCount: candidates.length,
    requestId,
    durationMs,
    prompt,
    promptSha256: hashText(prompt),
    inputs: await Promise.all(inputPaths.map(describeInput)),
    outputs: candidates.map((candidate) => basename(candidate.absolutePath)),
    ...(usage === undefined ? {} : { usage })
  };
  const metadataPath = resolve(runDirectory, "metadata.json");
  await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
  logger.info("completed", {
    runId,
    candidates: candidates.length,
    requestId,
    proxyDurationMs: durationMs,
    totalDurationMs: Date.now() - operationStartedAt,
    runDirectory: relative(repositoryRoot, runDirectory).split("\\").join("/"),
    metadataPath: relative(repositoryRoot, metadataPath).split("\\").join("/")
  });

  return {
    runId,
    candidates,
    requestId,
    durationMs,
    ...(usage === undefined ? {} : { usage })
  };
};
