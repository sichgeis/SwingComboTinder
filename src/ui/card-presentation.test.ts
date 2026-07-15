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

  it("derives card status from the nightly choice", () => {
    const figure = figureFor("inside-turn");
    expect(renderCardMarkup({ figure, language: "en", index: 0 })).toContain("CURIOUS");
    expect(renderCardMarkup({ figure, language: "de", index: 0 })).toContain("NEUGIERIG");
    expect(renderCardMarkup({ figure, language: "en", index: 0, deckChoice: "pass" })).toContain("NOT TONIGHT");
    expect(renderCardMarkup({ figure, language: "en", index: 0, deckChoice: "keep" })).toContain("GOT IT");
    expect(renderCardMarkup({ figure, language: "en", index: 0, deckChoice: "star" })).toContain("TRY TONIGHT");
  });

  it("localizes semantic family, count, and motion codes", () => {
    const figure = figureFor("inside-turn");
    const english = renderCardMarkup({ figure, language: "en", index: 0 });
    const german = renderCardMarkup({ figure, language: "de", index: 0 });
    expect(english).toContain("Turn");
    expect(english).toContain("6 or 8 count");
    expect(english).toContain("Rotational");
    expect(german).toContain("Drehung");
    expect(german).toContain("6 oder 8 Counts");
    expect(german).toContain("Rotierend");
  });

  it("renders structured ending positions in canonical order", () => {
    const promenade = figureFor("promenade");
    expect(renderCardMarkup({ figure: promenade, language: "en", index: 0 })).toContain("Ends Open / Closed");
    expect(renderCardMarkup({ figure: promenade, language: "de", index: 0 })).toContain("Endet Open / Closed");
    const grooveWalk = figureFor("groove-walk");
    expect(renderCardMarkup({ figure: grooveWalk, language: "en", index: 0 })).toContain("Ends Any");
    expect(renderCardMarkup({ figure: grooveWalk, language: "de", index: 0 })).toContain("Endet Beliebig");
  });
});
