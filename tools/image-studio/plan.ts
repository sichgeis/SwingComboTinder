import type { FigureRecord, GenerationPlan, SelectionOptions } from "./types";

export const planGeneration = (
  figures: readonly FigureRecord[],
  options: SelectionOptions
): GenerationPlan => {
  const ids = new Set(options.ids ?? []);
  const selected = figures.filter((figure) => {
    if (options.style && figure.style !== options.style) return false;
    if (options.mode === "selected") return ids.has(figure.id);
    if (options.mode === "missing") return !figure.hasCurrent;
    if (options.mode === "marked") return figure.marked;
    return true;
  });

  if (options.mode === "selected" && ids.size === 0) {
    throw new Error("Selected mode requires at least one figure ID.");
  }

  return {
    ready: selected.filter((figure) => figure.hasPose),
    blocked: selected.filter((figure) => !figure.hasPose)
  };
};
