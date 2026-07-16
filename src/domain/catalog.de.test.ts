import { describe, expect, it } from "vitest";
import { figures } from "../../figures/catalog";
import { moves } from "./catalog";
import { parseGuideBody } from "./guide-body";

describe("German move guides", () => {
  it("provides complete teaching copy for every move", () => {
    expect(figures.map(({ move }) => move.id).sort()).toEqual(moves.map(({ id }) => id).sort());
    for (const { guides: { de: guide } } of figures) {
      const copy = [guide.description, guide.body, guide.remember];
      expect(copy.every((text) => text.trim().length >= 30)).toBe(true);
      const parsed = parseGuideBody(guide.body);
      expect(parsed.issues).toEqual([]);
      expect(parsed.sections.length).toBeGreaterThan(0);
    }
  });
});
