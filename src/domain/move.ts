export const moveStyles = ["lindy", "charleston", "shag"] as const;
export type MoveStyle = (typeof moveStyles)[number];

export const buildChoices = ["pass", "keep", "star"] as const;
export type BuildChoice = (typeof buildChoices)[number];

export const languages = ["en", "de"] as const;
export type Language = (typeof languages)[number];

export const moveFamilies = [
  "circular", "linear", "turn", "position", "rhythm", "transition", "travel",
  "charleston", "charleston-turn", "tandem", "shag-rhythm", "shag-turn"
] as const;
export type MoveFamily = (typeof moveFamilies)[number];

export const countPatterns = ["six", "eight", "six-or-eight", "six-or-twelve", "eight-or-sixteen", "musical"] as const;
export type CountPattern = (typeof countPatterns)[number];

export const motionKinds = ["linear", "rotational", "circular", "vertical", "travel"] as const;
export type MotionKind = (typeof motionKinds)[number];

export const endPositions = ["open", "closed", "side-by-side", "wrapped", "tandem"] as const;
export type EndPosition = (typeof endPositions)[number];

export type MoveEnding =
  | { readonly kind: "positions"; readonly positions: readonly EndPosition[] }
  | { readonly kind: "any" };

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
  readonly family: MoveFamily;
  readonly count: CountPattern;
  readonly motion: MotionKind;
  readonly end: MoveEnding;
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
