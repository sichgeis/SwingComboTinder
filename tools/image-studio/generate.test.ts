import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";

import { generateFigure } from "./generate";
import type { FigureRecord } from "./types";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe("generateFigure", () => {
  it("sends the teaching frame and style references through LiteLLM", async () => {
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
      currentPath: resolve(directory, "current.png"),
      fallbackPath: resolve(directory, "fallback.png"),
      hasPose: true,
      hasCurrent: false,
      hasFallback: false,
      marked: false,
      poseDirection: "Keep the dancers' feet and frame exactly as shown.",
      characterDirection: "Render both dancers as warm, expressive characters.",
      candidates: []
    };
    const generatedBytes = Buffer.from("generated-image");
    const fetchMock = vi.fn((_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.method).toBe("POST");
      expect(init?.headers).toEqual({ authorization: "Bearer proxy-key" });
      expect(init?.body).toBeInstanceOf(FormData);
      const form = init?.body as FormData;
      expect(form.getAll("image")).toHaveLength(4);
      expect(form.get("model")).toBe("proxy-image-alias");
      expect(form.get("n")).toBe("1");
      expect(form.get("size")).toBe("1024x1536");
      expect(form.get("quality")).toBe("medium");
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
        model: "proxy-image-alias",
        quality: "medium",
        size: "1024x1536",
        count: 1,
        timeoutMs: 1_000
      },
      { apiKey: "proxy-key", baseUrl: "https://litellm.example.test" }
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://litellm.example.test/v1/images/edits",
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
  });
});
