import { describe, expect, it } from "vitest";

import { buildPrompt } from "./prompt";
import { findFigure } from "./repository";

describe("buildPrompt", () => {
  it("assigns the ordered references and fills move-specific directions", async () => {
    const figure = await findFigure("lindy/swingout-open");
    const prompt = await buildPrompt(figure);

    expect(prompt).toContain("Image 1 is the authoritative teaching frame");
    expect(prompt).toContain("Images 2–4 are style references only");
    expect(prompt).toContain("Dance figure: Swingout from Open");
    expect(prompt).toContain(figure.poseDirection);
    expect(prompt).toContain(figure.characterDirection);
    expect(prompt).not.toContain("[MOVE NAME]");
    expect(prompt).not.toContain("[PASTE FROM");
  });
});
