import type { Move, MoveGuide, MoveTranslation } from "../src/domain/move";

export const videoKinds = ["tutorial", "technique", "variation", "history"] as const;
export type VideoKind = (typeof videoKinds)[number];

export type FigureMove = Omit<Move, keyof MoveGuide>;

export interface TeachingSource {
  readonly videoId: string;
  readonly title?: string;
  readonly channel?: string;
  readonly timestampSeconds?: number;
  readonly frame?: string;
  readonly notes?: string;
}

export interface CardVideoLink {
  readonly videoId: string;
  readonly title: string;
  readonly kind: VideoKind;
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
    readonly teachingSources: readonly TeachingSource[];
    readonly cardLinks: readonly CardVideoLink[];
  };
}

export const defineFigure = <const Definition extends FigureDefinition>(definition: Definition): Definition => definition;

export const youtubeUrl = (videoId: string): string => `https://www.youtube.com/watch?v=${videoId}`;
