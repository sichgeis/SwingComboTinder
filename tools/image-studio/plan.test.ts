import { describe, expect, it } from "vitest";

import { planGeneration } from "./plan";
import type { FigureRecord } from "./types";

const figure = (
  id: string,
  options: { hasPose?: boolean; hasCurrent?: boolean; marked?: boolean } = {}
): FigureRecord => {
  const [style = "lindy", slug = id] = id.split("/");
  return {
    id,
    style,
    slug,
    name: slug,
    directory: `/tmp/${id}`,
    notesPath: `/tmp/${id}/notes.md`,
    definitionPath: `/tmp/${id}/figure.ts`,
    posePath: `/tmp/${id}/teaching-frames/selected.png`,
    poseOptions: [],
    currentPath: `/tmp/${id}/generated/current.png`,
    fallbackPath: `/tmp/${id}/card.jpg`,
    hasPose: options.hasPose ?? true,
    hasCurrent: options.hasCurrent ?? true,
    hasFallback: true,
    marked: options.marked ?? false,
    imageApproved: false,
    poseDirection: "Pose",
    characterDirection: "Characters",
    generationNote: "",
    candidates: []
  };
};

describe("planGeneration", () => {
  const figures = [
    figure("lindy/ready"),
    figure("lindy/rework", { marked: true }),
    figure("shag/missing", { hasCurrent: false, hasPose: false })
  ];

  it("selects missing figures and reports absent pose references as blocked", () => {
    const plan = planGeneration(figures, { mode: "missing" });
    expect(plan.ready).toEqual([]);
    expect(plan.blocked.map(({ id }) => id)).toEqual(["shag/missing"]);
  });

  it("combines marked selection with a style filter", () => {
    const plan = planGeneration(figures, { mode: "marked", style: "lindy" });
    expect(plan.ready.map(({ id }) => id)).toEqual(["lindy/rework"]);
  });

  it("requires IDs in selected mode", () => {
    expect(() => planGeneration(figures, { mode: "selected" })).toThrow(/requires/);
  });
});
