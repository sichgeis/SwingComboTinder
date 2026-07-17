import type { Move } from "../src/domain/move";
import type { FigureDefinition } from "./define-figure";

interface FigureModule {
  readonly default: FigureDefinition;
}

const modules = import.meta.glob<FigureModule>("./{lindy,charleston,shag}/*/figure.ts", { eager: true });
const discoveredFigures = Object.values(modules).map(({ default: definition }) => definition);

const assertUnique = (values: readonly (string | number)[], label: string): void => {
  if (new Set(values).size !== values.length) throw new Error(`Figure ${label} values must be unique`);
};

assertUnique(discoveredFigures.map(({ move }) => move.id), "id");
assertUnique(discoveredFigures.map(({ order }) => order), "order");

export const allFigures: readonly FigureDefinition[] = [...discoveredFigures].sort((left, right) => left.order - right.order);

export const publishedFiguresFrom = (definitions: readonly FigureDefinition[]): FigureDefinition[] =>
  definitions.filter(({ publication }) => publication === "published");

export const figures: readonly FigureDefinition[] = publishedFiguresFrom(allFigures);

export const publishedFigureFor = (definitions: readonly FigureDefinition[], id: string): FigureDefinition => {
  const figure = publishedFiguresFrom(definitions).find(({ move }) => move.id === id);
  if (!figure) throw new Error(`Unknown figure: ${id}`);
  return figure;
};

export const figureFor = (id: string): FigureDefinition => publishedFigureFor(allFigures, id);

export const moves: readonly Move[] = figures.map(({ move }) => move);
