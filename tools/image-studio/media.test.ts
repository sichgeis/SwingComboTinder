import { mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { versionedMediaUrl } from "./media";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe("versionedMediaUrl", () => {
  it("changes when a mutable asset is atomically replaced at the same path", async () => {
    const directory = await mkdtemp(resolve(tmpdir(), "studio-media-"));
    temporaryDirectories.push(directory);
    const asset = resolve(directory, "selected.png");
    const replacement = resolve(directory, "replacement.png");
    await writeFile(asset, "first-pixels");
    const first = await versionedMediaUrl(asset);

    await writeFile(replacement, "other-pixels");
    await rename(replacement, asset);
    const second = await versionedMediaUrl(asset);

    expect(first).toContain("/media?path=");
    expect(first).not.toBe(second);
    expect(new URL(second, "http://studio.test").searchParams.get("path")).toContain("selected.png");
  });
});
