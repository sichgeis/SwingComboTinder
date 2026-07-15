import { moveStyles } from "../../src/domain/move";
import { videoKinds, webResourceKinds, type FigureDefinition, type WebResourceKind } from "../../figures/define-figure";

export const resourceLanguages = ["en", "de"] as const;
type ResourceLanguage = (typeof resourceLanguages)[number];

export interface ContentValidationIssue {
  readonly path: string;
  readonly message: string;
}

export interface FigureIdentityDto {
  readonly id: string;
  readonly style: string;
  readonly slug: string;
  readonly order: number;
  readonly cardImport: string;
}

export interface FigureBasicsDto {
  readonly name: string;
  readonly alias: string;
  readonly family: string;
  readonly count: string;
  readonly motion: string;
  readonly end: string;
  readonly familiarity: string;
  readonly flows: string;
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
  readonly headings: {
    readonly steps: string;
    readonly body: string;
    readonly lead: string;
    readonly connection: string;
    readonly follow: string;
    readonly practice: string;
  };
  readonly follow: string;
  readonly practice: string;
}

export interface TeachingSourceDto {
  readonly videoId: string;
  readonly title?: string;
  readonly channel?: string;
  readonly timestampSeconds?: number;
  readonly frame?: string;
  readonly notes?: string;
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
  readonly language?: ResourceLanguage;
}

export type CardResourceDto = YoutubeResourceDto | WebResourceDto;

export interface FigureContentDto {
  readonly identity: FigureIdentityDto;
  readonly basics: FigureBasicsDto;
  readonly guides: {
    readonly en: GuideDto;
    readonly de: GermanGuideDto;
  };
  readonly teachingSources: readonly TeachingSourceDto[];
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

const textValue = (value: unknown, path: string, issues: ContentValidationIssue[], required = true): string => {
  if (typeof value !== "string") {
    issues.push({ path, message: "Expected text." });
    return "";
  }
  if (required && value.trim().length === 0) issues.push({ path, message: "Required text cannot be empty." });
  return value;
};

const numberValue = (value: unknown, path: string, issues: ContentValidationIssue[]): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    issues.push({ path, message: "Expected a number." });
    return 0;
  }
  return value;
};

const optionalText = (source: Record<string, unknown>, key: string, path: string, issues: ContentValidationIssue[]): string | undefined => {
  const value = source[key];
  if (value === undefined) return undefined;
  return textValue(value, `${path}.${key}`, issues, false);
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
  const headings = record(source.headings, `${path}.headings`, issues);
  const practice = textValue(source.practice, `${path}.practice`, issues);
  if (practice.trim() && !practice.trim().endsWith("?")) {
    issues.push({ path: `${path}.practice`, message: "The practice prompt must end with a question mark." });
  }
  return {
    ...guide,
    headings: {
      steps: textValue(headings.steps, `${path}.headings.steps`, issues),
      body: textValue(headings.body, `${path}.headings.body`, issues),
      lead: textValue(headings.lead, `${path}.headings.lead`, issues),
      connection: textValue(headings.connection, `${path}.headings.connection`, issues),
      follow: textValue(headings.follow, `${path}.headings.follow`, issues),
      practice: textValue(headings.practice, `${path}.headings.practice`, issues)
    },
    follow: textValue(source.follow, `${path}.follow`, issues),
    practice
  };
};

const youtubeId = (value: unknown, path: string, issues: ContentValidationIssue[]): string => {
  const id = textValue(value, path, issues);
  if (id && !/^[\w-]{11}$/.test(id)) issues.push({ path, message: "Expected an 11-character YouTube video ID." });
  return id;
};

const parseTeachingSources = (value: unknown, issues: ContentValidationIssue[]): readonly TeachingSourceDto[] => {
  if (!Array.isArray(value)) {
    issues.push({ path: "teachingSources", message: "Expected a list." });
    return [];
  }
  return value.map((entry, index) => {
    const path = `teachingSources.${index}`;
    const source = record(entry, path, issues);
    const timestamp = source.timestampSeconds;
    if (timestamp !== undefined && (typeof timestamp !== "number" || !Number.isFinite(timestamp) || timestamp < 0)) {
      issues.push({ path: `${path}.timestampSeconds`, message: "Expected a non-negative number." });
    }
    const frame = optionalText(source, "frame", path, issues);
    if (frame && (!frame.startsWith("teaching-frames/") || frame.includes(".."))) {
      issues.push({ path: `${path}.frame`, message: "Frame must be inside teaching-frames/." });
    }
    return {
      videoId: youtubeId(source.videoId, `${path}.videoId`, issues),
      ...optional("title", optionalText(source, "title", path, issues)),
      ...optional("channel", optionalText(source, "channel", path, issues)),
      ...(typeof timestamp === "number" && Number.isFinite(timestamp) && timestamp >= 0 ? { timestampSeconds: timestamp } : {}),
      ...optional("frame", frame),
      ...optional("notes", optionalText(source, "notes", path, issues))
    };
  });
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
      if (language !== undefined && !resourceLanguages.includes(language as ResourceLanguage)) {
        issues.push({ path: `${path}.language`, message: "Resource language must be en or de." });
      }
      return [{
        type,
        url,
        title: textValue(source.title, `${path}.title`, issues),
        kind: kind as WebResourceDto["kind"],
        ...(typeof language === "string" ? { language: language as ResourceLanguage } : {})
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
  const style = textValue(identity.style, "identity.style", issues);
  if (!moveStyles.includes(style as (typeof moveStyles)[number])) issues.push({ path: "identity.style", message: "Unknown dance style." });
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
      alias: textValue(basics.alias, "basics.alias", issues),
      family: textValue(basics.family, "basics.family", issues),
      count: textValue(basics.count, "basics.count", issues),
      motion: textValue(basics.motion, "basics.motion", issues),
      end: textValue(basics.end, "basics.end", issues),
      familiarity: textValue(basics.familiarity, "basics.familiarity", issues),
      flows: textValue(basics.flows, "basics.flows", issues)
    },
    guides: {
      en: parseGuide(guides.en, "guides.en", issues),
      de: parseGermanGuide(guides.de, issues)
    },
    teachingSources: parseTeachingSources(source.teachingSources, issues),
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
    alias: content.basics.alias,
    style: content.identity.style,
    family: content.basics.family,
    count: content.basics.count,
    motion: content.basics.motion,
    end: content.basics.end,
    familiarity: content.basics.familiarity,
    flows: content.basics.flows
  },
  guides: content.guides,
  youtube: {
    teachingSources: content.teachingSources,
    cardLinks: content.cardResources.filter((resource): resource is YoutubeResourceDto => resource.type === "youtube").map(({ videoId, title, kind }) => ({ videoId, title, kind }))
  },
  resources: {
    cardLinks: content.cardResources.filter((resource): resource is WebResourceDto => resource.type === "web").map(({ url, title, kind, language }) => ({ url, title, kind, ...optional("language", language) }))
  }
});

export const figureDefinitionFromContent = (contentValue: unknown, card: string): FigureDefinition => {
  const content = validateFigureContent(contentValue);
  const definition = figureDefinitionDataFromContent(content);
  return {
    card,
    ...(definition as Omit<FigureDefinition, "card">)
  };
};
