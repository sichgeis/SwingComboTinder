import type { GermanMoveGuide, Language, Move, MoveGuide } from "../src/domain/move";

export const videoKinds = ["tutorial", "technique", "variation", "history"] as const;
export type VideoKind = (typeof videoKinds)[number];
export const webResourceKinds = ["article", "reference"] as const;
export type WebResourceKind = (typeof webResourceKinds)[number];

export interface CardVideoLink {
  readonly type: "youtube";
  readonly videoId: string;
  readonly title: string;
  readonly kind: VideoKind;
}

export interface CardWebLink {
  readonly type: "web";
  readonly url: string;
  readonly title: string;
  readonly kind: WebResourceKind;
  readonly language?: Language;
}

export type CardResource = CardVideoLink | CardWebLink;

export interface FigureDefinition {
  readonly order: number;
  readonly card: string;
  readonly move: Move;
  readonly guides: {
    readonly en: MoveGuide;
    readonly de: GermanMoveGuide;
  };
  readonly resources: readonly CardResource[];
}

export const defineFigure = <const Definition extends FigureDefinition>(definition: Definition): Definition => definition;

export const youtubeUrl = (videoId: string): string => `https://www.youtube.com/watch?v=${videoId}`;
