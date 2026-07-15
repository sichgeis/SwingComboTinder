import { describe, expect, it } from "vitest";

import { figureFor } from "../../figures/catalog";
import { renderCardMarkup } from "./card-presentation";

describe("card presentation", () => {
  it("escapes editable text and renders language-appropriate web resources", () => {
    const original = figureFor("inside-turn");
    const figure = {
      ...original,
      move: { ...original.move, name: "Inside <Turn>" },
      resources: {
        cardLinks: [
          { url: "https://example.com/en", title: "English reference", kind: "reference" as const, language: "en" as const },
          { url: "https://example.com/de", title: "Deutsche Quelle", kind: "article" as const, language: "de" as const }
        ]
      }
    };
    const markup = renderCardMarkup({ figure, language: "de", index: 0 });
    expect(markup).toContain("Inside &lt;Turn&gt;");
    expect(markup).toContain("Deutsche Quelle");
    expect(markup).not.toContain("English reference");
  });
});
