import { describe, expect, it } from "vitest";

import { buildPrompt, DEFAULT_INSTRUCTIONS } from "./prompt";

describe("buildPrompt", () => {
  it("returns the fixed base instructions without move-specific additions", () => {
    expect(buildPrompt()).toBe(DEFAULT_INSTRUCTIONS);
    expect(buildPrompt()).toContain("IMAGE 1 — STRICT POSE AND COMPOSITION REFERENCE");
    expect(buildPrompt()).toContain("IMAGES 2–5 — STYLE REFERENCES ONLY");
    expect(buildPrompt()).toContain("IDENTITY REPLACEMENT AND COMMUNITY REPRESENTATION");
    expect(buildPrompt()).toContain("Create one clean instructional Lindy Hop dance-card illustration.");
    expect(buildPrompt()).not.toContain("Pose direction");
    expect(buildPrompt()).not.toContain("Character direction");
  });

  it("appends a concise figure-specific correction when provided", () => {
    const prompt = buildPrompt("The right dancer raises the left leg.");

    expect(prompt.startsWith(DEFAULT_INSTRUCTIONS)).toBe(true);
    expect(prompt).toContain("FIGURE-SPECIFIC CORRECTION");
    expect(prompt).toContain("The right dancer raises the left leg.");
  });
});
