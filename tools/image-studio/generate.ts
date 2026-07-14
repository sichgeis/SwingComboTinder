import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, relative, resolve } from "node:path";

import sharp from "sharp";

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
  timeoutMs: number
): Promise<Response> => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}` },
        body,
        signal: AbortSignal.timeout(timeoutMs)
      });
      if ((response.status !== 429 && response.status < 500) || attempt === 2) return response;
    } catch (error) {
      if (attempt === 2) throw new Error(`Could not reach LiteLLM proxy: ${String(error)}`, { cause: error });
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250 * 2 ** attempt));
  }
  throw new Error("Could not reach LiteLLM proxy.");
};

const imageBytes = async (image: LiteLLMImageResult, timeoutMs: number): Promise<Buffer> => {
  if (image.b64_json) {
    const decoded = Buffer.from(image.b64_json, "base64");
    if (decoded.length === 0) throw new Error("LiteLLM returned invalid base64 image data.");
    return decoded;
  }
  if (image.url) {
    const response = await fetch(image.url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) throw new Error(`Could not download LiteLLM image result: HTTP ${response.status}.`);
    return Buffer.from(await response.arrayBuffer());
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
  if (!connection.apiKey || !connection.baseUrl) {
    throw new Error("LITELLM_API_KEY and LITELLM_BASE_URL must be set in .env or the shell.");
  }
  if (!figure.hasPose) throw new Error(`${figure.id} has no teaching-frames/selected.png.`);
  if (options.count < 1 || options.count > 4) throw new Error("Candidate count must be 1–4.");

  const prompt = await buildPrompt(figure);
  const inputPaths = [figure.posePath, ...styleReferencePaths];
  const preparedInputs = await Promise.all(inputPaths.map(prepareInput));
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
    options.timeoutMs
  );
  const durationMs = Date.now() - startedAt;
  const requestId = proxyResponse.headers.get("x-request-id");
  if (!proxyResponse.ok) {
    throw new Error(
      `LiteLLM returned HTTP ${proxyResponse.status}: ${(await proxyResponse.text()).slice(0, 2000)}`
    );
  }
  const response = parseLiteLLMResponse(await proxyResponse.json());
  if (response.data.length === 0) throw new Error("LiteLLM returned no image candidates.");
  const generatedImages = await Promise.all(
    response.data.map(async (image) => imageBytes(image, options.timeoutMs))
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
  await writeFile(resolve(runDirectory, "metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`);

  return {
    runId,
    candidates,
    requestId,
    durationMs,
    ...(usage === undefined ? {} : { usage })
  };
};
