import { describe, expect, it } from "vitest";
import { isIntentionalCardGesture, isIntentionalHorizontalGesture } from "./horizontal-gesture";

describe("horizontal gesture guard", () => {
  const start = { x: 100, y: 200 };

  it("blocks clear horizontal movement in either direction", () => {
    expect(isIntentionalHorizontalGesture(start, { x: 130, y: 204 })).toBe(true);
    expect(isIntentionalHorizontalGesture(start, { x: 65, y: 198 })).toBe(true);
  });

  it("preserves vertical scrolling, taps, and diagonal movement", () => {
    expect(isIntentionalHorizontalGesture(start, { x: 103, y: 240 })).toBe(false);
    expect(isIntentionalHorizontalGesture(start, { x: 106, y: 202 })).toBe(false);
    expect(isIntentionalHorizontalGesture(start, { x: 120, y: 225 })).toBe(false);
  });

  it("recognizes deliberate movement in every card decision direction", () => {
    expect(isIntentionalCardGesture(start, { x: 100, y: 180 })).toBe(true);
    expect(isIntentionalCardGesture(start, { x: 120, y: 200 })).toBe(true);
    expect(isIntentionalCardGesture(start, { x: 96, y: 196 })).toBe(false);
  });
});
