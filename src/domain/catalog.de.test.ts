import { describe, expect, it } from "vitest";
import { figures } from "../../figures/catalog";
import { moves } from "./catalog";

describe("German move guides", () => {
  it("provides complete teaching copy for every move", () => {
    expect(figures.map(({ move }) => move.id).sort()).toEqual(moves.map(({ id }) => id).sort());
    for (const { guides: { de: guide } } of figures) {
      const copy = [guide.description, guide.steps, guide.body, guide.lead, guide.follow, guide.connection, guide.practice, guide.cue];
      expect(copy.every((text) => text.trim().length >= 30)).toBe(true);
      const headings = [guide.headings.steps, guide.headings.body, guide.headings.lead, guide.headings.follow, guide.headings.connection, guide.headings.practice];
      expect(headings.every((heading) => heading.trim().length >= 7)).toBe(true);
      expect(guide.practice.trim().endsWith("?")).toBe(true);
    }
  });
});
