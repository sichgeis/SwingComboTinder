import type { Move, MoveGuide, MoveTranslation } from "../src/domain/move";

export const videoKinds = ["tutorial", "technique", "variation", "history"] as const;
export type VideoKind = (typeof videoKinds)[number];
export const webResourceKinds = ["article", "reference"] as const;
export type WebResourceKind = (typeof webResourceKinds)[number];

export type FigureMove = Omit<Move, keyof MoveGuide>;

export interface CardVideoLink {
  readonly videoId: string;
  readonly title: string;
  readonly kind: VideoKind;
}

export interface CardWebLink {
  readonly url: string;
  readonly title: string;
  readonly kind: WebResourceKind;
  readonly language?: "en" | "de";
}

export interface FigureDefinition {
  readonly order: number;
  readonly card: string;
  readonly move: FigureMove;
  readonly guides: {
    readonly en: MoveGuide;
    readonly de: MoveTranslation;
  };
  readonly youtube: {
    readonly cardLinks: readonly CardVideoLink[];
  };
  readonly resources?: {
    readonly cardLinks: readonly CardWebLink[];
  };
}

export const defineFigure = <const Definition extends FigureDefinition>(definition: Definition): Definition => definition;

export const youtubeUrl = (videoId: string): string => `https://www.youtube.com/watch?v=${videoId}`;
