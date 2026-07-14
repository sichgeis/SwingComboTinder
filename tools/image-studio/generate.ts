import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, relative, resolve } from "node:path";

import OpenAI, { toFile } from "openai";
import sharp from "sharp";

import { repositoryRoot, styleReferencePaths } from "./paths";
import { buildPrompt, hashText } from "./prompt";
import type {
  CandidateImage,
  FigureRecord,
  GeneratedCandidateSet,
  GenerationOptions,
  TokenUsage
} from "./types";

interface InputMetadata {
  readonly path: string;
  readonly sha256: string;
  readonly bytes: number;
  readonly width?: number;
  readonly height?: number;
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
  apiKey = process.env.OPENAI_API_KEY
): Promise<GeneratedCandidateSet> => {
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set. Add it to the shell running the studio or CLI.");
  }
  if (!figure.hasPose) throw new Error(`${figure.id} has no teaching-frames/selected.png.`);
  if (options.count < 1 || options.count > 4) throw new Error("Candidate count must be 1–4.");

  const prompt = await buildPrompt(figure);
  const inputPaths = [figure.posePath, ...styleReferencePaths];
  const preparedInputs = await Promise.all(inputPaths.map(prepareInput));
  const uploads = await Promise.all(
    preparedInputs.map(async (buffer, index) =>
      toFile(buffer, index === 0 ? "01-teaching-frame.webp" : `${String(index + 1).padStart(2, "0")}-style-reference.webp`, {
        type: "image/webp"
      })
    )
  );

  const client = new OpenAI({ apiKey, maxRetries: 2, timeout: 5 * 60 * 1000 });
  const startedAt = Date.now();
  const { data: response, request_id: requestId } = await client.images
    .edit({
      model: options.model,
      image: uploads,
      prompt,
      n: options.count,
      size: options.size,
      quality: options.quality,
      output_format: "png",
      background: "opaque"
    })
    .withResponse();
  const durationMs = Date.now() - startedAt;
  const images = response.data ?? [];
  if (images.length === 0) throw new Error("OpenAI returned no image candidates.");

  const runId = createRunId();
  const runDirectory = resolve(figure.directory, "generated/candidates", runId);
  await mkdir(runDirectory, { recursive: true });
  const createdAt = new Date().toISOString();
  const candidates: CandidateImage[] = [];
  for (const [index, image] of images.entries()) {
    if (!image.b64_json) throw new Error(`Candidate ${index + 1} did not contain image data.`);
    const absolutePath = resolve(runDirectory, `candidate-${index + 1}.png`);
    await writeFile(absolutePath, Buffer.from(image.b64_json, "base64"));
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
