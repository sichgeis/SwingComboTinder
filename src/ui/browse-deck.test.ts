import { describe, expect, it } from "vitest";
import type { Move } from "../domain/move";
import { adjacentBrowseIndex, figuresForBrowsing } from "./browse-deck";

const figure = (id: string): Move => ({ id } as Move);

describe("browse deck", () => {
  it("contains comfortable and try-tonight figures, but not passed or undecided figures", () => {
    const figures = [figure("comfortable"), figure("adventure"), figure("later"), figure("unseen")];
    expect(figuresForBrowsing(figures, {
      comfortable: "keep",
      adventure: "star",
      later: "pass"
    }).map(({ id }) => id)).toEqual(["comfortable", "adventure"]);
  });

  it("wraps navigation at both ends of the deck", () => {
    expect(adjacentBrowseIndex(2, 3, "next")).toBe(0);
    expect(adjacentBrowseIndex(0, 3, "previous")).toBe(2);
    expect(adjacentBrowseIndex(0, 0, "next")).toBe(0);
  });
});
