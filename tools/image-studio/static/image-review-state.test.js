import { describe, expect, it } from "vitest";

import { applyImageApproval, shouldCollapseImageReview } from "./image-review-state.js";

describe("image review state", () => {
  it("consumes the new marker and collapses a completed card on approval", () => {
    const figure = { id: "lindy/test", imageApproved: false, marked: false };
    const newCandidates = new Map([[figure.id, 2], ["lindy/other", 1]]);

    applyImageApproval(figure, newCandidates, true);

    expect(figure.imageApproved).toBe(true);
    expect(newCandidates.has(figure.id)).toBe(false);
    expect(newCandidates.get("lindy/other")).toBe(1);
    expect(shouldCollapseImageReview(figure, newCandidates.get(figure.id) || 0)).toBe(true);
  });

  it("keeps rework and later new candidates expanded", () => {
    const figure = { id: "lindy/test", imageApproved: true, marked: true };

    expect(shouldCollapseImageReview(figure, 0)).toBe(false);
    figure.marked = false;
    expect(shouldCollapseImageReview(figure, 1)).toBe(false);
  });
});
