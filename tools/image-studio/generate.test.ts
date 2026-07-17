import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";

import { generateFigure } from "./generate";
import type { FigureRecord } from "./types";

const temporaryDirectories: string[] = [];
const originalLogLevel = process.env.IMAGE_STUDIO_LOG_LEVEL;

afterEach(async () => {
  vi.unstubAllGlobals();
  if (originalLogLevel === undefined) delete process.env.IMAGE_STUDIO_LOG_LEVEL;
  else process.env.IMAGE_STUDIO_LOG_LEVEL = originalLogLevel;
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe("generateFigure", () => {
  it("uses the shared multi-image multipart field for OpenAI and LiteLLM", async () => {
    process.env.IMAGE_STUDIO_LOG_LEVEL = "error";
    const directory = await mkdtemp(resolve(tmpdir(), "image-studio-generate-"));
    temporaryDirectories.push(directory);
    const posePath = resolve(directory, "selected.png");
    await sharp({
      create: { width: 8, height: 8, channels: 3, background: "white" }
    })
      .png()
      .toFile(posePath);

    const figure: FigureRecord = {
      id: "lindy/test-move",
      style: "lindy",
      slug: "test-move",
      name: "Test Move",
      directory,
      notesPath: resolve(directory, "notes.md"),
      definitionPath: resolve(directory, "definition.md"),
      posePath,
      poseOptions: [{ absolutePath: posePath, relativePath: "teaching-frames/selected.png", filename: "selected.png", selected: true }],
      currentPath: resolve(directory, "current.png"),
      fallbackPath: resolve(directory, "fallback.png"),
      hasPose: true,
      hasCurrent: false,
      hasFallback: false,
      marked: false,
      imageApproved: false,
      poseDirection: "Keep the dancers' feet and frame exactly as shown.",
      characterDirection: "Render both dancers as warm, expressive characters.",
      generationNote: "The left dancer raises the right leg.",
      candidates: []
    };
    const generatedBytes = Buffer.from("generated-image");
    const fetchMock = vi.fn((_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.method).toBe("POST");
      expect(init?.headers).toEqual({ authorization: "Bearer openai-key" });
      expect(init?.body).toBeInstanceOf(FormData);
      const form = init?.body as FormData;
      if (form.getAll("image").length > 0) {
        return Promise.resolve(new Response(
          JSON.stringify({
            error: {
              message: "Duplicate parameter: 'image'.",
              type: "invalid_request_error",
              param: "image",
              code: "duplicate_parameter"
            }
          }),
          { status: 400, headers: { "content-type": "application/json" } }
        ));
      }
      const images = form.getAll("image[]");
      expect(images).toHaveLength(4);
      expect(images.map((image) => image instanceof File ? image.name : "")).toEqual([
        "01-teaching-frame.webp",
        "02-style-reference.webp",
        "03-style-reference.webp",
        "04-style-reference.webp"
      ]);
      expect(form.get("model")).toBe("gpt-image-2");
      expect(form.get("n")).toBe("1");
      expect(form.get("size")).toBe("1024x1536");
      expect(form.get("quality")).toBe("medium");
      expect(form.get("prompt")).toContain("The left dancer raises the right leg.");
      return Promise.resolve(new Response(
        JSON.stringify({
          data: [{ b64_json: generatedBytes.toString("base64") }],
          usage: {
            input_tokens: 4,
            input_tokens_details: { image_tokens: 3, text_tokens: 1 },
            output_tokens: 5,
            total_tokens: 9
          }
        }),
        { status: 200, headers: { "content-type": "application/json", "x-request-id": "req-test" } }
      ));
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateFigure(
      figure,
      {
        model: "gpt-image-2",
        quality: "medium",
        size: "1024x1536",
        count: 1,
        timeoutMs: 1_000
      },
      { apiKey: "openai-key", baseUrl: "https://api.openai.test", provider: "openai" }
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.test/v1/images/edits",
      expect.any(Object)
    );
    expect(await readFile(result.candidates[0]!.absolutePath)).toEqual(generatedBytes);
    expect(result.requestId).toBe("req-test");
    expect(result.usage).toEqual({
      inputTokens: 4,
      inputImageTokens: 3,
      inputTextTokens: 1,
      outputTokens: 5,
      totalTokens: 9
    });

    await generateFigure(
      figure,
      {
        model: "gpt-image-2",
        quality: "medium",
        size: "1024x1536",
        count: 1,
        timeoutMs: 1_000
      },
      { apiKey: "openai-key", baseUrl: "https://litellm.example.test", provider: "litellm" }
    );
    expect(fetchMock).toHaveBeenLastCalledWith(
      "https://litellm.example.test/v1/images/edits",
      expect.any(Object)
    );

    await expect(generateFigure(
      figure,
      {
        model: "gpt-image-2",
        quality: "medium",
        size: "1024x1536",
        count: 1,
        timeoutMs: 1_000
      },
      { apiKey: undefined, baseUrl: "https://api.openai.com", provider: "openai" }
    )).rejects.toThrow("OPENAI_API_KEY must be set");
  });
});
