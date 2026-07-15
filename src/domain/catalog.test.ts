import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { figures } from "../../figures/catalog";
import { moves } from "./catalog";
import { countPatterns, endPositions, motionKinds, moveFamilies } from "./move";

describe("move catalog", () => {
  it("preserves the complete unique catalog", () => {
    expect(moves).toHaveLength(42);
    expect(new Set(moves.map(({ id }) => id)).size).toBe(42);
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
    expect(figures.map(({ order }) => order)).toEqual(Array.from({ length: 42 }, (_, index) => index + 1));
    expect(new Set(figures.map(({ order }) => order)).size).toBe(42);
    expect(figures.map(({ move }) => move.id)).toEqual(moves.map(({ id }) => id));
  });

  it("provides complete metadata and English teaching copy", () => {
    for (const { move, guides: { en: guide } } of figures) {
      expect([move.id, move.name, move.family, move.motion, move.count]
        .every((value) => value.trim().length > 0)).toBe(true);
      expect([guide.description, guide.steps, guide.body, guide.lead, guide.connection, guide.cue]
        .every((value) => value.trim().length >= 20)).toBe(true);
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
