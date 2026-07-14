import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getImageEnvironment, loadEnvironment } from "./environment";

const variableNames = [
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
  it("loads the supported settings from an env file", async () => {
    const path = await writeEnvironment(`LITELLM_API_KEY=test-key
LITELLM_BASE_URL=https://litellm.example.test/v1/
IMAGE_MODEL=test-image-model
IMAGE_SIZE=1024x1536
IMAGE_QUALITY=high
REQUEST_TIMEOUT_SECONDS=42
IMAGE_STUDIO_PORT=4321
IMAGE_STUDIO_LOG_LEVEL=debug
`);

    loadEnvironment(path);

    expect(getImageEnvironment()).toEqual({
      litellmApiKey: "test-key",
      litellmBaseUrl: "https://litellm.example.test",
      model: "test-image-model",
      imageSize: "1024x1536",
      imageQuality: "high",
      requestTimeoutMs: 42_000,
      studioPort: 4321,
      logLevel: "debug"
    });
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
