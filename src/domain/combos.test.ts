import { describe, expect, it } from "vitest";
import { moves } from "./catalog";
import { generateCombos } from "./combos";
import { createSession, movesForStyles } from "./session";

describe("combo generation", () => {
  it("is deterministic for a session seed and contains distinct steps", () => {
    const session = createSession(["lindy"]);
    const deck = movesForStyles(moves, session.styles);
    const first = generateCombos(deck, session);
    const second = generateCombos(deck, session);

    expect(first).toEqual(second);
    for (const combo of first) expect(new Set(combo.steps.map(({ id }) => id)).size).toBe(combo.steps.length);
  });

  it("never introduces moves from a style outside the deck", () => {
    const session = createSession(["shag"]);
    const deck = movesForStyles(moves, session.styles);
    const combos = generateCombos(deck, session);
    expect(combos.flatMap(({ steps }) => steps).every(({ style }) => style === "shag")).toBe(true);
  });

  it("falls back to the selected deck after every move was passed", () => {
    const base = createSession(["charleston"]);
    const deck = movesForStyles(moves, base.styles);
    const session = { ...base, choices: Object.fromEntries(deck.map(({ id }) => [id, "pass" as const])) };
    const combos = generateCombos(deck, session);
    expect(combos).toHaveLength(3);
    expect(combos.every(({ steps }) => steps.length > 0)).toBe(true);
  });

  it("returns no suggestions for an empty deck", () => {
    expect(generateCombos([], createSession())).toEqual([]);
  });
});
