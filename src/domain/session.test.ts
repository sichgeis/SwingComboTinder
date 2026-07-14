import { describe, expect, it } from "vitest";
import { moves } from "./catalog";
import { createSession, movesForStyles, reconcileSession, recordDecision, undoDecision } from "./session";

describe("session", () => {
  it("filters decks by one or multiple styles", () => {
    expect(movesForStyles(moves, ["charleston"])).toHaveLength(6);
    expect(movesForStyles(moves, ["lindy", "shag"])).toHaveLength(36);
  });

  it("records and immutably undoes a decision", () => {
    const initial = createSession();
    const move = moves[0];
    if (!move) throw new Error("Catalog fixture is empty");
    const decided = recordDecision(initial, move, "star");

    expect(decided).not.toBe(initial);
    expect(decided.index).toBe(1);
    expect(decided.choices[move.id]).toBe("star");
    expect(initial.index).toBe(0);
    expect(undoDecision(decided)).toEqual(initial);
  });

  it("leaves an empty history unchanged", () => {
    const session = createSession();
    expect(undoDecision(session)).toBe(session);
  });

  it("keeps choices aligned when a new move is inserted into a deck", () => {
    const deck = movesForStyles(moves, ["lindy"]);
    const newMoveIndex = deck.findIndex(({ id }) => id === "schiebetuer");
    const oldDeck = deck.filter(({ id }) => id !== "schiebetuer");
    const choices = Object.fromEntries(oldDeck.map(({ id }) => [id, "keep" as const]));
    const history = oldDeck.map(({ id }, index) => ({ id, index, action: "keep" as const }));

    const reconciled = reconcileSession({ ...createSession(), index: oldDeck.length, choices, history }, deck);
    expect(reconciled.index).toBe(newMoveIndex);
    expect(reconciled.history.at(-1)?.index).toBe(deck.length - 2);

    const newMove = deck[newMoveIndex];
    if (!newMove) throw new Error("Schiebetür fixture is missing");
    const completed = reconcileSession(recordDecision(reconciled, newMove, "star"), deck);
    expect(completed.index).toBe(deck.length);
  });
});
