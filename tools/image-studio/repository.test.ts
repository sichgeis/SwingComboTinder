import { describe, expect, it } from "vitest";

import { discoverFigures } from "./repository";

describe("discoverFigures", () => {
  it("discovers the full repository catalog and its generation readiness", async () => {
    const figures = await discoverFigures();
    expect(figures).toHaveLength(42);
    expect(figures.filter(({ style }) => style === "lindy")).toHaveLength(28);
    expect(figures.filter(({ style }) => style === "charleston")).toHaveLength(6);
    expect(figures.filter(({ style }) => style === "shag")).toHaveLength(8);
    expect(figures.filter(({ hasPose }) => hasPose)).toHaveLength(34);
    expect(figures.filter(({ hasCurrent }) => hasCurrent)).toHaveLength(34);
  });
});
