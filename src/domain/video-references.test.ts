import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { figures } from "../../figures/catalog";
import { videoKinds, youtubeUrl } from "../../figures/define-figure";

describe("per-figure YouTube references", () => {
  it("contains valid app-visible links", () => {
    for (const { youtube } of figures) {
      for (const reference of youtube.cardLinks) {
        expect(reference.title.trim().length).toBeGreaterThan(5);
        expect(reference.videoId).toMatch(/^[\w-]{11}$/);
        expect(youtubeUrl(reference.videoId)).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/);
        expect(videoKinds).toContain(reference.kind);
      }
    }
  });

  it("keeps teaching sources beside their referenced frames", () => {
    for (const figure of figures) {
      for (const source of figure.youtube.teachingSources) {
        expect(source.videoId).toMatch(/^[\w-]{11}$/);
        if (source.frame) {
          expect(source.frame.startsWith("teaching-frames/")).toBe(true);
          expect(existsSync(new URL(`../../figures/${figure.move.style}/${figure.move.id}/${source.frame}`, import.meta.url))).toBe(true);
        }
      }
    }
  });

  it("contains safe app-visible web resources", () => {
    for (const figure of figures) {
      for (const resource of figure.resources?.cardLinks ?? []) {
        expect(["article", "reference"]).toContain(resource.kind);
        expect(resource.title.trim().length).toBeGreaterThan(0);
        expect(new URL(resource.url).protocol).toMatch(/^https?:$/);
        if (resource.language) expect(["en", "de"]).toContain(resource.language);
      }
    }
  });
});
