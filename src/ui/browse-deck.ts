import type { BuildChoice, Move } from "../domain/move";

export const figuresForBrowsing = (
  moves: readonly Move[],
  choices: Readonly<Record<string, BuildChoice>>
): Move[] => moves.filter(({ id }) => choices[id] !== "pass");

export const adjacentBrowseIndex = (
  index: number,
  length: number,
  direction: "previous" | "next"
): number => {
  if (length <= 0) return 0;
  return direction === "next" ? (index + 1) % length : (index - 1 + length) % length;
};
