import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { allFigures, figures, publishedFigureFor, publishedFiguresFrom } from "../../figures/catalog";
import { moves } from "./catalog";
import { parseGuideBody } from "./guide-body";
import { countPatterns, endPositions, motionKinds, moveFamilies } from "./move";

describe("move catalog", () => {
  it("preserves the complete unique catalog", () => {
    expect(allFigures).toHaveLength(42);
    expect(moves).toHaveLength(42);
    expect(new Set(moves.map(({ id }) => id)).size).toBe(42);
  });

  it("exposes only explicitly published figures to the app catalog and lookup", () => {
    const published = allFigures[0];
    const draftSource = allFigures[1];
    if (!published || !draftSource) throw new Error("Catalog fixtures are missing");
    const draft = { ...draftSource, publication: "draft" as const };
    const sourceCatalog = [published, draft];

    expect(publishedFiguresFrom(sourceCatalog)).toEqual([published]);
    expect(publishedFigureFor(sourceCatalog, published.move.id)).toBe(published);
    expect(() => publishedFigureFor(sourceCatalog, draft.move.id)).toThrow(`Unknown figure: ${draft.move.id}`);
  });

  it("preserves each focused deck", () => {
    expect(moves.filter(({ style }) => style === "lindy")).toHaveLength(28);
    expect(moves.filter(({ style }) => style === "charleston")).toHaveLength(6);
    expect(moves.filter(({ style }) => style === "shag")).toHaveLength(8);
  });

  it("provides move-specific artwork for every catalog entry", () => {
    for (const figure of figures) {
      const directory = new URL(`../../figures/${figure.move.style}/${figure.move.id}/`, import.meta.url);
      expect(existsSync(new URL("figure.ts", directory))).toBe(true);
      expect(existsSync(new URL("card.jpg", directory))).toBe(true);
      expect(existsSync(new URL("notes.md", directory))).toBe(true);
      expect(figure.card).toMatch(/[?&]format=webp&quality=80$/);
    }
  });

  it("preserves explicit unique ordering", () => {
    expect(allFigures.every(({ publication }) => publication === "published")).toBe(true);
    expect(figures.map(({ order }) => order)).toEqual(Array.from({ length: 42 }, (_, index) => index + 1));
    expect(new Set(figures.map(({ order }) => order)).size).toBe(42);
    expect(figures.map(({ move }) => move.id)).toEqual(moves.map(({ id }) => id));
  });

  it("provides complete metadata and English teaching copy", () => {
    for (const { move, guides: { en: guide } } of figures) {
      expect([move.id, move.name, move.family, move.motion, move.count]
        .every((value) => value.trim().length > 0)).toBe(true);
      expect([guide.description, guide.body, guide.remember]
        .every((value) => value.trim().length >= 20)).toBe(true);
      const parsed = parseGuideBody(guide.body);
      expect(parsed.issues).toEqual([]);
      expect(parsed.sections.length).toBeGreaterThan(0);
    }
  });

  it("uses constrained metadata and canonical ending positions", () => {
    for (const { move } of figures) {
      expect(moveFamilies).toContain(move.family);
      expect(countPatterns).toContain(move.count);
      expect(motionKinds).toContain(move.motion);
      if (move.end.kind === "any") continue;
      expect(move.end.positions.length).toBeGreaterThan(0);
      expect(new Set(move.end.positions).size).toBe(move.end.positions.length);
      expect(move.end.positions).toEqual(endPositions.filter((position) => move.end.kind === "positions" && move.end.positions.includes(position)));
    }
  });
});
