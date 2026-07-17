import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getImageEnvironment, loadEnvironment } from "./environment";

const variableNames = [
  "IMAGE_API_PROVIDER",
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "LITELLM_API_KEY",
  "LITELLM_BASE_URL",
  "IMAGE_MODEL",
  "IMAGE_SIZE",
  "IMAGE_QUALITY",
  "REQUEST_TIMEOUT_SECONDS",
  "IMAGE_STUDIO_PORT",
  "IMAGE_STUDIO_LOG_LEVEL"
] as const;
const originalEnvironment = new Map(variableNames.map((name) => [name, process.env[name]]));
const temporaryDirectories: string[] = [];

beforeEach(() => {
  for (const name of variableNames) delete process.env[name];
});

afterEach(async () => {
  for (const name of variableNames) {
    const original = originalEnvironment.get(name);
    if (original === undefined) delete process.env[name];
    else process.env[name] = original;
  }
  await Promise.all(temporaryDirectories.splice(0).map(async (path) => rm(path, { recursive: true })));
});

const writeEnvironment = async (content: string): Promise<string> => {
  const directory = await mkdtemp(resolve(tmpdir(), "image-studio-env-"));
  temporaryDirectories.push(directory);
  const path = resolve(directory, ".env");
  await writeFile(path, content);
  return path;
};

describe("image studio environment", () => {
  it("loads a direct OpenAI configuration and normalizes its base URL", async () => {
    const path = await writeEnvironment(`IMAGE_API_PROVIDER=openai
OPENAI_API_KEY=test-key
OPENAI_BASE_URL=https://api.openai.test/v1/
IMAGE_MODEL=test-image-model
IMAGE_SIZE=1024x1536
IMAGE_QUALITY=high
REQUEST_TIMEOUT_SECONDS=42
IMAGE_STUDIO_PORT=4321
IMAGE_STUDIO_LOG_LEVEL=debug
`);

    loadEnvironment(path);

    expect(getImageEnvironment()).toEqual({
      imageApiProvider: "openai",
      imageApiKey: "test-key",
      imageApiBaseUrl: "https://api.openai.test",
      model: "test-image-model",
      imageSize: "1024x1536",
      imageQuality: "high",
      requestTimeoutMs: 42_000,
      studioPort: 4321,
      logLevel: "debug"
    });
  });

  it("defaults direct OpenAI to the public API base URL", () => {
    process.env.OPENAI_API_KEY = "direct-key";
    expect(getImageEnvironment()).toMatchObject({
      imageApiProvider: "openai",
      imageApiKey: "direct-key",
      imageApiBaseUrl: "https://api.openai.com"
    });
  });

  it("infers and preserves a legacy LiteLLM configuration", async () => {
    loadEnvironment(await writeEnvironment(`LITELLM_API_KEY=legacy-key
LITELLM_BASE_URL=https://litellm.example.test/v1/
`));
    expect(getImageEnvironment()).toMatchObject({
      imageApiProvider: "litellm",
      imageApiKey: "legacy-key",
      imageApiBaseUrl: "https://litellm.example.test"
    });
  });

  it("keeps legacy LiteLLM precedence when both configurations are present without a provider", () => {
    process.env.OPENAI_API_KEY = "openai-key";
    process.env.LITELLM_API_KEY = "litellm-key";
    process.env.LITELLM_BASE_URL = "https://litellm.example.test";
    expect(getImageEnvironment()).toMatchObject({
      imageApiProvider: "litellm",
      imageApiKey: "litellm-key",
      imageApiBaseUrl: "https://litellm.example.test"
    });
  });

  it("honors an explicit provider when both configurations are present", () => {
    process.env.IMAGE_API_PROVIDER = "litellm";
    process.env.OPENAI_API_KEY = "openai-key";
    process.env.LITELLM_API_KEY = "litellm-key";
    process.env.LITELLM_BASE_URL = "https://litellm.example.test";
    expect(getImageEnvironment()).toMatchObject({
      imageApiProvider: "litellm",
      imageApiKey: "litellm-key",
      imageApiBaseUrl: "https://litellm.example.test"
    });
  });

  it("rejects an unknown provider", () => {
    process.env.IMAGE_API_PROVIDER = "other";
    expect(() => getImageEnvironment()).toThrow(/must be openai or litellm/);
  });

  it("preserves an existing shell variable", async () => {
    process.env.IMAGE_MODEL = "shell-model";
    loadEnvironment(await writeEnvironment("IMAGE_MODEL=file-model\n"));
    expect(getImageEnvironment().model).toBe("shell-model");
  });

  it("rejects an output size unsupported by GPT Image 2", () => {
    process.env.IMAGE_SIZE = "100x200";
    expect(() => getImageEnvironment()).toThrow(/dimension constraints/);
  });

  it("rejects an unknown log level", () => {
    process.env.IMAGE_STUDIO_LOG_LEVEL = "verbose";
    expect(() => getImageEnvironment()).toThrow(/must be error, warn, info, or debug/);
  });
});
