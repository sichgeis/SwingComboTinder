import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { importYouTubeTranscript, listTranscriptFiles } from "./transcripts";

describe("Studio transcripts", () => {
  it("invokes title-based JSON download mode and returns a contained result", async () => {
    const directory = await mkdtemp(resolve(tmpdir(), "studio-transcripts-"));
    const transcripts = resolve(directory, "transcripts");
    await mkdir(transcripts);
    const destination = resolve(transcripts, "Original Video Title.md");
    await writeFile(destination, "transcript\n");
    const calls: string[][] = [];

    const result = await importYouTubeTranscript(
      { id: "lindy/test", directory },
      " https://youtu.be/P083vG0JKB8 ",
      (args) => {
        calls.push([...args]);
        return Promise.resolve({
          code: 0,
          stdout: JSON.stringify({
            results: [{
              videoId: "P083vG0JKB8",
              status: "written",
              path: destination,
              filename: "Original Video Title.md",
              message: "",
              title: "Original Video Title",
              channel: "Teacher"
            }]
          }),
          stderr: ""
        });
      }
    );

    expect(calls).toEqual([[
      "--figure", "lindy/test", "--json", "--title-filename", "--", "https://youtu.be/P083vG0JKB8"
    ]]);
    expect(result).toMatchObject({
      status: "written",
      videoId: "P083vG0JKB8",
      filename: "Original Video Title.md",
      title: "Original Video Title"
    });
    const listed = await listTranscriptFiles({ id: "lindy/test", directory });
    expect(listed).toHaveLength(1);
    expect(listed[0]?.filename).toBe("Original Video Title.md");
    expect(listed[0]?.path.endsWith("Original Video Title.md")).toBe(true);
  });

  it("rejects downloader failures and paths outside the selected figure", async () => {
    const directory = await mkdtemp(resolve(tmpdir(), "studio-transcripts-"));
    const command = () => Promise.resolve({
      code: 1,
      stdout: JSON.stringify({ results: [{ status: "failed", message: "No captions are available" }] }),
      stderr: ""
    });
    await expect(importYouTubeTranscript({ id: "lindy/test", directory }, "https://youtu.be/P083vG0JKB8", command))
      .rejects.toThrow("No captions are available");

    const escaping = () => Promise.resolve({
      code: 0,
      stdout: JSON.stringify({ results: [{ status: "written", path: resolve(directory, "outside.md") }] }),
      stderr: ""
    });
    await expect(importYouTubeTranscript({ id: "lindy/test", directory }, "https://youtu.be/P083vG0JKB8", escaping))
      .rejects.toThrow("outside the selected figure");
  });
});
