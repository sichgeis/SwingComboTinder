import { describe, expect, it } from "vitest";
import { classifyCardGesture } from "./card-gesture";

describe("card gesture", () => {
  it("distinguishes a tap from deck decisions", () => {
    expect(classifyCardGesture(3, -4, { flipped: false })).toBe("tap");
    expect(classifyCardGesture(-110, 8, { flipped: false })).toBe("pass");
    expect(classifyCardGesture(110, 8, { flipped: false })).toBe("keep");
    expect(classifyCardGesture(15, -110, { flipped: false })).toBe("star");
    expect(classifyCardGesture(8, -68, { flipped: false })).toBe("star");
    expect(classifyCardGesture(22, -96, { flipped: false })).toBe("star");
    expect(classifyCardGesture(62, -68, { flipped: false })).toBe("star");
    expect(classifyCardGesture(8, -55, { flipped: false })).toBe("cancel");
    expect(classifyCardGesture(80, -68, { flipped: false })).toBe("star");
    expect(classifyCardGesture(96, -68, { flipped: false })).toBe("keep");
  });

  it("reserves vertical movement for reading on the back", () => {
    expect(classifyCardGesture(5, -120, { flipped: true })).toBe("scroll");
    expect(classifyCardGesture(105, 18, { flipped: true })).toBe("keep");
    expect(classifyCardGesture(-105, 18, { flipped: true })).toBe("pass");
  });
});
