import { describe, expect, it } from "vitest";

import { parseGuideBody } from "./guide-body";

describe("guide body", () => {
  it("parses ordered sections and multiple paragraphs", () => {
    const parsed = parseGuideBody("## First take\n\nOne paragraph.\n\nA second paragraph.\n\n## Another take\n\nDifferent advice.");
    expect(parsed.issues).toEqual([]);
    expect(parsed.sections).toEqual([
      { heading: "First take", paragraphs: ["One paragraph.", "A second paragraph."] },
      { heading: "Another take", paragraphs: ["Different advice."] }
    ]);
  });

  it("allows duplicate localized headings", () => {
    const parsed = parseGuideBody("## Idee\n\nErster Blick.\n\n## Idee\n\nZweiter Blick.");
    expect(parsed.issues).toEqual([]);
    expect(parsed.sections.map(({ heading }) => heading)).toEqual(["Idee", "Idee"]);
  });

  it("reports line-oriented structural problems", () => {
    expect(parseGuideBody("Loose copy\n\n## Valid\n\nCopy").issues).toContainEqual({
      line: 1,
      message: "Guide body must begin with a ## section heading."
    });
    expect(parseGuideBody("## Empty\n\n## Filled\n\nCopy").issues).toContainEqual({
      line: 3,
      message: "Section “Empty” needs at least one paragraph."
    });
  });
});
