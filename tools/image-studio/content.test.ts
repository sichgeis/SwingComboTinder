import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { figuresRoot } from "./paths";
import { discoverFigures } from "./repository";
import {
  ContentConflictError,
  ContentValidationError,
  parseFigureContent,
  readFigureContentFile,
  saveFigureContentFile,
  serializeFigureContent
} from "./content";

describe("figure content persistence", () => {
  it("reads every existing figure definition", async () => {
    const figures = await discoverFigures();
    expect(figures).toHaveLength(42);
    for (const figure of figures) {
      const loaded = await readFigureContentFile(figure.definitionPath, figure.slug);
      expect(loaded.content.identity.id).toBe(figure.slug);
      expect(loaded.content.identity.style).toBe(figure.style);
      expect(loaded.revision).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it("round trips YouTube and web resources deterministically", async () => {
    const source = await readFile(resolve(figuresRoot, "charleston/hand-to-hand/figure.ts"), "utf8");
    const content = parseFigureContent(source, "figure.ts", "hand-to-hand");
    const changed = {
      ...content,
      cardResources: [...content.cardResources, {
        type: "web" as const,
        url: "https://example.com/hand-to-hand",
        title: "Hand-to-Hand reference",
        kind: "reference" as const,
        language: "en" as const
      }]
    };
    const serialized = serializeFigureContent(changed);
    expect(parseFigureContent(serialized, "figure.ts", "hand-to-hand")).toEqual(changed);
    expect(serializeFigureContent(parseFigureContent(serialized, "figure.ts", "hand-to-hand"))).toBe(serialized);
  });

  it("rejects invalid content with field-level issues", async () => {
    const source = await readFile(resolve(figuresRoot, "lindy/inside-turn/figure.ts"), "utf8");
    const content = parseFigureContent(source, "figure.ts", "inside-turn");
    expect(() => serializeFigureContent({ ...content, basics: { ...content.basics, name: "" } })).toThrow(ContentValidationError);
    expect(() => serializeFigureContent({ ...content, basics: { ...content.basics, family: "typo" } })).toThrow(ContentValidationError);
    expect(() => serializeFigureContent({ ...content, basics: { ...content.basics, count: "seven" } })).toThrow(ContentValidationError);
    expect(() => serializeFigureContent({ ...content, basics: { ...content.basics, motion: "sideways" } })).toThrow(ContentValidationError);
    expect(() => serializeFigureContent({ ...content, basics: { ...content.basics, end: { kind: "positions", positions: [] } } })).toThrow(ContentValidationError);
    expect(() => serializeFigureContent({ ...content, basics: { ...content.basics, end: { kind: "positions", positions: ["open", "open"] } } })).toThrow(ContentValidationError);
    expect(() => serializeFigureContent({ ...content, basics: { ...content.basics, end: { kind: "positions", positions: ["somewhere"] } } })).toThrow(ContentValidationError);
    try {
      serializeFigureContent({ ...content, guides: { ...content.guides, en: { ...content.guides.en, body: "Copy before a heading" } } });
      throw new Error("Expected invalid guide body to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(ContentValidationError);
      expect((error as ContentValidationError).issues).toContainEqual({
        path: "guides.en.body",
        message: "Line 1: Guide body must begin with a ## section heading."
      });
    }
  });

  it("normalizes ending positions into canonical order", async () => {
    const source = await readFile(resolve(figuresRoot, "lindy/inside-turn/figure.ts"), "utf8");
    const content = parseFigureContent(source, "figure.ts", "inside-turn");
    const reordered = { ...content, basics: { ...content.basics, end: { kind: "positions", positions: ["closed", "open"] } } };
    const normalized = parseFigureContent(serializeFigureContent(reordered), "figure.ts", "inside-turn");
    expect(normalized.basics.end).toEqual({ kind: "positions", positions: ["open", "closed"] });
  });

  it("detects stale writes and leaves the external source unchanged", async () => {
    const directory = await mkdtemp(resolve(tmpdir(), "swing-content-"));
    const path = resolve(directory, "figure.ts");
    const originalPath = resolve(figuresRoot, "lindy/inside-turn/figure.ts");
    await writeFile(path, await readFile(originalPath, "utf8"));
    const loaded = await readFigureContentFile(path, "inside-turn");
    await writeFile(path, `${await readFile(path, "utf8")}\n// external edit\n`);
    await expect(saveFigureContentFile(path, loaded.content.identity, loaded.revision, loaded.content)).rejects.toBeInstanceOf(ContentConflictError);
    expect(await readFile(path, "utf8")).toContain("// external edit");
  });

  it("atomically saves valid content and returns its new revision", async () => {
    const directory = await mkdtemp(resolve(tmpdir(), "swing-content-save-"));
    const path = resolve(directory, "figure.ts");
    const originalDirectory = resolve(figuresRoot, "lindy/inside-turn");
    await writeFile(path, await readFile(resolve(originalDirectory, "figure.ts"), "utf8"));
    const loaded = await readFigureContentFile(path, "inside-turn");
    const changed = { ...loaded.content, basics: { ...loaded.content.basics, name: "A revised name" } };
    const saved = await saveFigureContentFile(path, loaded.content.identity, loaded.revision, changed);
    expect(saved.revision).not.toBe(loaded.revision);
    expect((await readFigureContentFile(path, "inside-turn")).content.basics.name).toBe("A revised name");
  });
});
