import { describe, expect, it } from "vitest";

import { mapWithConcurrency } from "./pool";

describe("mapWithConcurrency", () => {
  it("preserves order while bounding active work", async () => {
    let active = 0;
    let maximumActive = 0;
    const result = await mapWithConcurrency([1, 2, 3, 4], 2, async (value) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return value * 2;
    });

    expect(result).toEqual([2, 4, 6, 8]);
    expect(maximumActive).toBe(2);
  });
});
