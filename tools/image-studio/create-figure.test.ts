import { mkdir, mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";

import { createFigurePackage, FigureCreationError } from "./create-figure";

const temporaryDirectories: string[] = [];

const fixtureRoot = async (): Promise<string> => {
  const root = await mkdtemp(resolve(tmpdir(), "studio-create-figure-"));
  temporaryDirectories.push(root);
  await Promise.all(["lindy", "charleston", "shag"].map(async (style) => {
    await mkdir(resolve(root, style));
  }));
  return root;
};

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("createFigurePackage", () => {
  it("creates a complete draft package with the next global order", async () => {
    const root = await fixtureRoot();
    await createFigurePackage({ name: "Existing Lindy", style: "lindy", slug: "existing-lindy" }, root);
    await createFigurePackage({ name: "Existing Shag", style: "shag", slug: "existing-shag" }, root);

    const created = await createFigurePackage({ name: "New Circle", style: "charleston", slug: "new-circle" }, root);
    const directory = resolve(root, "charleston/new-circle");

    expect(created.id).toBe("charleston/new-circle");
    expect(created.loaded.content.publication).toBe("draft");
    expect(created.loaded.content.identity.order).toBe(3);
    expect(created.loaded.content.identity.cardImport).toContain("./card.jpg?");
    expect(created.loaded.content.cardResources).toEqual([]);
    expect((await stat(resolve(directory, "teaching-frames"))).isDirectory()).toBe(true);
    expect((await stat(resolve(directory, "generated"))).isDirectory()).toBe(true);
    expect(await sharp(resolve(directory, "card.jpg")).metadata()).toMatchObject({ width: 600, height: 900, format: "jpeg" });
    const notes = await readFile(resolve(directory, "notes.md"), "utf8");
    expect(notes).toContain("- [x] Needs rework");
    expect(notes).toContain("- [ ] Image approved");
  });

  it("rejects a stable ID already used by another style", async () => {
    const root = await fixtureRoot();
    await createFigurePackage({ name: "First", style: "lindy", slug: "shared-id" }, root);

    await expect(createFigurePackage({ name: "Second", style: "shag", slug: "shared-id" }, root))
      .rejects.toMatchObject({
        issues: [{ path: "slug", message: "That stable ID is already used." }]
      });
    await expect(stat(resolve(root, "shag/shared-id"))).rejects.toThrow();
  });

  it("removes its temporary package when a write fails", async () => {
    const root = await fixtureRoot();

    await expect(createFigurePackage(
      { name: "Broken", style: "lindy", slug: "broken" },
      root,
      { writePlaceholder: () => Promise.reject(new Error("render failed")) }
    )).rejects.toThrow("render failed");

    expect((await readdir(resolve(root, "lindy"))).filter((entry) => entry.includes("broken"))).toEqual([]);
  });

  it("returns field issues without creating files for invalid details", async () => {
    const root = await fixtureRoot();
    await expect(createFigurePackage({ name: "", style: "tap", slug: "Not valid" }, root))
      .rejects.toBeInstanceOf(FigureCreationError);
    expect(await readdir(resolve(root, "lindy"))).toEqual([]);
  });
});
