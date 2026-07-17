export const generationModes = ["selected", "missing", "marked", "all"] as const;
export type GenerationMode = (typeof generationModes)[number];

export const imageQualities = ["low", "medium", "high"] as const;
export type ImageQuality = (typeof imageQualities)[number];

export interface CandidateImage {
  readonly absolutePath: string;
  readonly relativePath: string;
  readonly createdAt: string;
  readonly runId: string;
}

export interface TeachingPoseOption {
  readonly absolutePath: string;
  readonly relativePath: string;
  readonly filename: string;
  readonly selected: boolean;
}

export interface FigureRecord {
  readonly id: string;
  readonly style: string;
  readonly slug: string;
  readonly name: string;
  readonly directory: string;
  readonly notesPath: string;
  readonly definitionPath: string;
  readonly posePath: string;
  readonly currentPath: string;
  readonly fallbackPath: string;
  readonly hasPose: boolean;
  readonly hasCurrent: boolean;
  readonly hasFallback: boolean;
  readonly marked: boolean;
  readonly imageApproved: boolean;
  readonly poseDirection: string;
  readonly characterDirection: string;
  readonly generationNote: string;
  readonly poseOptions: readonly TeachingPoseOption[];
  readonly candidates: readonly CandidateImage[];
}

export interface SelectionOptions {
  readonly mode: GenerationMode;
  readonly style?: string;
  readonly ids?: readonly string[];
}

export interface GenerationPlan {
  readonly ready: readonly FigureRecord[];
  readonly blocked: readonly FigureRecord[];
}

export interface GenerationOptions {
  readonly model: string;
  readonly quality: ImageQuality;
  readonly size: string;
  readonly count: number;
  readonly timeoutMs: number;
}

export interface LiteLLMConnection {
  readonly apiKey: string | undefined;
  readonly baseUrl: string | undefined;
}

export interface TokenUsage {
  readonly inputTokens: number;
  readonly inputImageTokens: number;
  readonly inputTextTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
}

export interface GeneratedCandidateSet {
  readonly runId: string;
  readonly candidates: readonly CandidateImage[];
  readonly requestId: string | null;
  readonly durationMs: number;
  readonly usage?: TokenUsage;
}
