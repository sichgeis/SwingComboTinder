export const moveStyles = ["lindy", "charleston", "shag"] as const;
export type MoveStyle = (typeof moveStyles)[number];

export const choices = ["pass", "keep", "star"] as const;
export type Choice = (typeof choices)[number];

export const languages = ["en", "de"] as const;
export type Language = (typeof languages)[number];

export interface MoveGuide {
  readonly description: string;
  readonly steps: string;
  readonly body: string;
  readonly lead: string;
  readonly connection: string;
  readonly cue: string;
}

export interface GuideHeadings {
  readonly steps: string;
  readonly body: string;
  readonly lead: string;
  readonly connection: string;
  readonly follow: string;
  readonly practice: string;
}

export interface Move {
  readonly id: string;
  readonly name: string;
  readonly alias: string;
  readonly style: MoveStyle;
  readonly family: string;
  readonly count: string;
  readonly motion: string;
  readonly end: string;
  readonly familiarity: string;
  readonly description: string;
  readonly steps: string;
  readonly body: string;
  readonly lead: string;
  readonly connection: string;
  readonly cue: string;
  readonly flows: string;
}

export type MoveTranslation = MoveGuide & {
  readonly headings: GuideHeadings;
  readonly follow: string;
  readonly practice: string;
};

export const isMoveStyle = (value: unknown): value is MoveStyle =>
  typeof value === "string" && moveStyles.some((style) => style === value);

export const isChoice = (value: unknown): value is Choice =>
  typeof value === "string" && choices.some((choice) => choice === value);
