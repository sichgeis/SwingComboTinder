import {
  countPatterns,
  endPositions,
  motionKinds,
  languages,
  moveFamilies,
  moveStyles,
  type CountPattern,
  type EndPosition,
  type MotionKind,
  type MoveEnding,
  type MoveFamily,
  type Language,
  type MoveStyle
} from "../../src/domain/move";
import { videoKinds, webResourceKinds, type FigureDefinition, type WebResourceKind } from "../../figures/define-figure";

export const resourceLanguages = languages;

export const figureMetadataOptions = {
  families: moveFamilies,
  countPatterns,
  motionKinds,
  endPositions,
  videoKinds,
  webResourceKinds,
  resourceLanguages
} as const;

export interface ContentValidationIssue {
  readonly path: string;
  readonly message: string;
}

export interface FigureIdentityDto {
  readonly id: string;
  readonly style: MoveStyle;
  readonly slug: string;
  readonly order: number;
  readonly cardImport: string;
}

export interface FigureBasicsDto {
  readonly name: string;
  readonly family: MoveFamily;
  readonly count: CountPattern;
  readonly motion: MotionKind;
  readonly end: MoveEnding;
}

export interface GuideDto {
  readonly description: string;
  readonly steps: string;
  readonly body: string;
  readonly lead: string;
  readonly connection: string;
  readonly cue: string;
}

export interface GermanGuideDto extends GuideDto {
  readonly follow: string;
  readonly practice: string;
}

export interface YoutubeResourceDto {
  readonly type: "youtube";
  readonly videoId: string;
  readonly title: string;
  readonly kind: (typeof videoKinds)[number];
}

export interface WebResourceDto {
  readonly type: "web";
  readonly url: string;
  readonly title: string;
  readonly kind: WebResourceKind;
  readonly language?: Language;
}

export type CardResourceDto = YoutubeResourceDto | WebResourceDto;

export interface FigureContentDto {
  readonly identity: FigureIdentityDto;
  readonly basics: FigureBasicsDto;
  readonly guides: {
    readonly en: GuideDto;
    readonly de: GermanGuideDto;
  };
  readonly cardResources: readonly CardResourceDto[];
}

export interface LoadedFigureContent {
  readonly content: FigureContentDto;
  readonly revision: string;
}

export class ContentValidationError extends Error {
  public constructor(public readonly issues: readonly ContentValidationIssue[]) {
    super("Figure content is invalid.");
    this.name = "ContentValidationError";
  }
}


const record = (value: unknown, path: string, issues: ContentValidationIssue[]): Record<string, unknown> => {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) return value as Record<string, unknown>;
  issues.push({ path, message: "Expected an object." });
  return {};
};

const textValue = (value: unknown, path: string, issues: ContentValidationIssue[]): string => {
  if (typeof value !== "string") {
    issues.push({ path, message: "Expected text." });
    return "";
  }
  if (value.trim().length === 0) issues.push({ path, message: "Required text cannot be empty." });
  return value;
};

const numberValue = (value: unknown, path: string, issues: ContentValidationIssue[]): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    issues.push({ path, message: "Expected a number." });
    return 0;
  }
  return value;
};

const enumValue = <Value extends string>(
  value: unknown,
  allowed: readonly Value[],
  path: string,
  issues: ContentValidationIssue[]
): Value => {
  const parsed = textValue(value, path, issues);
  if (!allowed.some((candidate) => candidate === parsed)) issues.push({ path, message: "Unknown value." });
  return parsed as Value;
};

const parseEnding = (value: unknown, issues: ContentValidationIssue[]): MoveEnding => {
  const path = "basics.end";
  const source = record(value, path, issues);
  const kind = source.kind;
  if (kind === "any") return { kind };
  if (kind !== "positions") {
    issues.push({ path: `${path}.kind`, message: "Ending kind must be any or positions." });
    return { kind: "any" };
  }
  if (!Array.isArray(source.positions)) {
    issues.push({ path: `${path}.positions`, message: "Expected a list of ending positions." });
    return { kind, positions: [] };
  }
  const parsed = source.positions.map((position, index) => enumValue(position, endPositions, `${path}.positions.${index}`, issues));
  if (parsed.length === 0) issues.push({ path: `${path}.positions`, message: "Choose at least one ending position." });
  if (new Set(parsed).size !== parsed.length) issues.push({ path: `${path}.positions`, message: "Ending positions must be unique." });
  const selected = new Set<EndPosition>(parsed);
  return { kind, positions: endPositions.filter((position) => selected.has(position)) };
};

const parseGuide = (value: unknown, path: string, issues: ContentValidationIssue[]): GuideDto => {
  const source = record(value, path, issues);
  return {
    description: textValue(source.description, `${path}.description`, issues),
    steps: textValue(source.steps, `${path}.steps`, issues),
    body: textValue(source.body, `${path}.body`, issues),
    lead: textValue(source.lead, `${path}.lead`, issues),
    connection: textValue(source.connection, `${path}.connection`, issues),
    cue: textValue(source.cue, `${path}.cue`, issues)
  };
};

const parseGermanGuide = (value: unknown, issues: ContentValidationIssue[]): GermanGuideDto => {
  const path = "guides.de";
  const source = record(value, path, issues);
  const guide = parseGuide(source, path, issues);
  const practice = textValue(source.practice, `${path}.practice`, issues);
  if (practice.trim() && !practice.trim().endsWith("?")) {
    issues.push({ path: `${path}.practice`, message: "The practice prompt must end with a question mark." });
  }
  return {
    ...guide,
    follow: textValue(source.follow, `${path}.follow`, issues),
    practice
  };
};

const youtubeId = (value: unknown, path: string, issues: ContentValidationIssue[]): string => {
  const id = textValue(value, path, issues);
  if (id && !/^[\w-]{11}$/.test(id)) issues.push({ path, message: "Expected an 11-character YouTube video ID." });
  return id;
};

const optional = <Key extends string, Value>(key: Key, value: Value | undefined): { readonly [Property in Key]?: Value } =>
  value === undefined ? {} : { [key]: value } as { readonly [Property in Key]?: Value };

const parseCardResources = (value: unknown, issues: ContentValidationIssue[]): readonly CardResourceDto[] => {
  if (!Array.isArray(value)) {
    issues.push({ path: "cardResources", message: "Expected a list." });
    return [];
  }
  return value.flatMap((entry, index): readonly CardResourceDto[] => {
    const path = `cardResources.${index}`;
    const source = record(entry, path, issues);
    const type = source.type;
    if (type === "youtube") {
      const kind = textValue(source.kind, `${path}.kind`, issues);
      if (!videoKinds.includes(kind as (typeof videoKinds)[number])) issues.push({ path: `${path}.kind`, message: "Unknown YouTube resource category." });
      return [{
        type,
        videoId: youtubeId(source.videoId, `${path}.videoId`, issues),
        title: textValue(source.title, `${path}.title`, issues),
        kind: kind as YoutubeResourceDto["kind"]
      }];
    }
    if (type === "web") {
      const url = textValue(source.url, `${path}.url`, issues);
      try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error("protocol");
      } catch {
        if (url) issues.push({ path: `${path}.url`, message: "Expected an http or https URL." });
      }
      const kind = textValue(source.kind, `${path}.kind`, issues);
      if (!webResourceKinds.includes(kind as WebResourceDto["kind"])) issues.push({ path: `${path}.kind`, message: "Unknown web resource category." });
      const language = source.language;
      if (language !== undefined && !resourceLanguages.includes(language as Language)) {
        issues.push({ path: `${path}.language`, message: "Resource language must be en or de." });
      }
      return [{
        type,
        url,
        title: textValue(source.title, `${path}.title`, issues),
        kind: kind as WebResourceDto["kind"],
        ...(typeof language === "string" ? { language: language as Language } : {})
      }];
    }
    issues.push({ path: `${path}.type`, message: "Resource type must be youtube or web." });
    return [];
  });
};

export const validateFigureContent = (value: unknown): FigureContentDto => {
  const issues: ContentValidationIssue[] = [];
  const source = record(value, "content", issues);
  const identity = record(source.identity, "identity", issues);
  const basics = record(source.basics, "basics", issues);
  const guides = record(source.guides, "guides", issues);
  const style = enumValue(identity.style, moveStyles, "identity.style", issues);
  const order = numberValue(identity.order, "identity.order", issues);
  if (!Number.isInteger(order) || order < 0) issues.push({ path: "identity.order", message: "Order must be a non-negative integer." });
  const content: FigureContentDto = {
    identity: {
      id: textValue(identity.id, "identity.id", issues),
      style,
      slug: textValue(identity.slug, "identity.slug", issues),
      order,
      cardImport: textValue(identity.cardImport, "identity.cardImport", issues)
    },
    basics: {
      name: textValue(basics.name, "basics.name", issues),
      family: enumValue(basics.family, moveFamilies, "basics.family", issues),
      count: enumValue(basics.count, countPatterns, "basics.count", issues),
      motion: enumValue(basics.motion, motionKinds, "basics.motion", issues),
      end: parseEnding(basics.end, issues)
    },
    guides: {
      en: parseGuide(guides.en, "guides.en", issues),
      de: parseGermanGuide(guides.de, issues)
    },
    cardResources: parseCardResources(source.cardResources, issues)
  };
  if (issues.length) throw new ContentValidationError(issues);
  return content;
};

export const figureDefinitionDataFromContent = (content: FigureContentDto): Record<string, unknown> => ({
  order: content.identity.order,
  move: {
    id: content.identity.id,
    name: content.basics.name,
    style: content.identity.style,
    family: content.basics.family,
    count: content.basics.count,
    motion: content.basics.motion,
    end: content.basics.end
  },
  guides: content.guides,
  resources: content.cardResources.map((resource) => resource.type === "youtube"
    ? { type: resource.type, videoId: resource.videoId, title: resource.title, kind: resource.kind }
    : { type: resource.type, url: resource.url, title: resource.title, kind: resource.kind, ...optional("language", resource.language) })
});

export const figureDefinitionFromContent = (contentValue: unknown, card: string): FigureDefinition => {
  const content = validateFigureContent(contentValue);
  const definition = figureDefinitionDataFromContent(content);
  return {
    card,
    ...(definition as Omit<FigureDefinition, "card">)
  };
};
