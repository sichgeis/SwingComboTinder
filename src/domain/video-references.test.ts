import { describe, expect, it } from "vitest";
import { figures } from "../../figures/catalog";
import { videoKinds, webResourceKinds, youtubeUrl } from "../../figures/define-figure";

describe("per-figure YouTube references", () => {
  it("contains valid app-visible links", () => {
    for (const { resources } of figures) {
      for (const reference of resources.filter((resource) => resource.type === "youtube")) {
        expect(reference.title.trim().length).toBeGreaterThan(5);
        expect(reference.videoId).toMatch(/^[\w-]{11}$/);
        expect(youtubeUrl(reference.videoId)).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/);
        expect(videoKinds).toContain(reference.kind);
      }
    }
  });

  it("contains safe app-visible web resources", () => {
    for (const figure of figures) {
      for (const resource of figure.resources.filter((entry) => entry.type === "web")) {
        expect(webResourceKinds).toContain(resource.kind);
        expect(resource.title.trim().length).toBeGreaterThan(0);
        expect(new URL(resource.url).protocol).toMatch(/^https?:$/);
        if (resource.language) expect(["en", "de"]).toContain(resource.language);
      }
    }
  });
});
