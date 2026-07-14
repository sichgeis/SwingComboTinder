import { describe, expect, it } from "vitest";
import type { Move } from "../domain/move";
import { adjacentBrowseIndex, figuresForBrowsing } from "./browse-deck";

const figure = (id: string): Move => ({ id } as Move);

describe("browse deck", () => {
  it("contains every figure except those explicitly removed for tonight", () => {
    const figures = [figure("comfortable"), figure("adventure"), figure("later"), figure("unseen")];
    expect(figuresForBrowsing(figures, {
      comfortable: "keep",
      adventure: "star",
      later: "pass"
    }).map(({ id }) => id)).toEqual(["comfortable", "adventure", "unseen"]);
  });

  it("starts with the complete style deck when no decisions have been made", () => {
    const figures = [figure("swingout"), figure("circle"), figure("tuck-turn")];
    expect(figuresForBrowsing(figures, {})).toEqual(figures);
  });

  it("wraps navigation at both ends of the deck", () => {
    expect(adjacentBrowseIndex(2, 3, "next")).toBe(0);
    expect(adjacentBrowseIndex(0, 3, "previous")).toBe(2);
    expect(adjacentBrowseIndex(0, 0, "next")).toBe(0);
  });
});
