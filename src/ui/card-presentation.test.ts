import { describe, expect, it } from "vitest";

import { figureFor } from "../../figures/catalog";
import { renderCardMarkup } from "./card-presentation";

describe("card presentation", () => {
  it("escapes editable text and renders language-appropriate web resources", () => {
    const original = figureFor("inside-turn");
    const figure = {
      ...original,
      move: { ...original.move, name: "Inside <Turn>" },
      guides: {
        ...original.guides,
        de: {
          ...original.guides.de,
          body: "## Sicher <lesen>\n\nEin Absatz mit <script> und & Zeichen.\n\nNoch ein Absatz."
        }
      },
      resources: [
        { type: "web" as const, url: "https://example.com/en", title: "English reference", kind: "reference" as const, language: "en" as const },
        { type: "youtube" as const, videoId: "LX3WPFUpSEc", title: "Video tutorial", kind: "tutorial" as const },
        { type: "web" as const, url: "https://example.com/de", title: "Deutsche Quelle", kind: "article" as const, language: "de" as const }
      ]
    };
    const markup = renderCardMarkup({ figure, language: "de", index: 0 });
    expect(markup).toContain("Inside &lt;Turn&gt;");
    expect(markup).toContain("Sicher &lt;lesen&gt;");
    expect(markup).toContain("&lt;script&gt; und &amp; Zeichen");
    expect(markup).not.toContain("<script>");
    expect(markup).toContain("Noch ein Absatz.");
    expect(markup).toContain("Deutsche Quelle");
    expect(markup).not.toContain("English reference");
    expect(markup.indexOf("Video tutorial")).toBeLessThan(markup.indexOf("Deutsche Quelle"));
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
    expect(german).toContain("Was passiert?");
    expect(german).toContain("Woran du es merkst");
    expect(german).toContain("Rhythmus und Spielraum");
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
