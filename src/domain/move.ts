export const moveStyles = ["lindy", "charleston", "shag"] as const;
export type MoveStyle = (typeof moveStyles)[number];

export const buildChoices = ["pass", "keep", "star"] as const;
export type BuildChoice = (typeof buildChoices)[number];

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
  readonly style: MoveStyle;
  readonly family: string;
  readonly count: string;
  readonly motion: string;
  readonly end: string;
  readonly description: string;
  readonly steps: string;
  readonly body: string;
  readonly lead: string;
  readonly connection: string;
  readonly cue: string;
}

export type MoveTranslation = MoveGuide & {
  readonly headings: GuideHeadings;
  readonly follow: string;
  readonly practice: string;
};

export const isMoveStyle = (value: unknown): value is MoveStyle =>
  typeof value === "string" && moveStyles.some((style) => style === value);

export const isBuildChoice = (value: unknown): value is BuildChoice =>
  typeof value === "string" && buildChoices.some((choice) => choice === value);
