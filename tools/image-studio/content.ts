import { createHash } from "node:crypto";
import { access, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import ts from "typescript";

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

export class ContentConflictError extends Error {
  public constructor() {
    super("This figure changed on disk after it was opened. Reload it before saving.");
    this.name = "ContentConflictError";
  }
}

const revisionFor = (source: string): string => createHash("sha256").update(source).digest("hex");

const propertyName = (name: ts.PropertyName): string | undefined => {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return undefined;
};

const literalValue = (expression: ts.Expression): unknown => {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return expression.text;
  if (ts.isNumericLiteral(expression)) return Number(expression.text);
  if (expression.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (expression.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (expression.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isPrefixUnaryExpression(expression) && expression.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(expression.operand)) {
    return -Number(expression.operand.text);
  }
  if (ts.isArrayLiteralExpression(expression)) return expression.elements.map((element) => literalValue(element));
  if (ts.isObjectLiteralExpression(expression)) {
    const result: Record<string, unknown> = {};
    for (const property of expression.properties) {
      if (ts.isShorthandPropertyAssignment(property) && property.name.text === "card") continue;
      if (!ts.isPropertyAssignment(property)) throw new Error("Unsupported figure property syntax.");
      const name = propertyName(property.name);
      if (!name) throw new Error("Unsupported figure property name.");
      result[name] = literalValue(property.initializer);
    }
    return result;
  }
  throw new Error(`Unsupported figure value syntax: ${ts.SyntaxKind[expression.kind]}.`);
};

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

const definitionObject = (content: FigureContentDto): Record<string, unknown> => ({
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
  const definition = definitionObject(content);
  return {
    card,
    ...(definition as Omit<FigureDefinition, "card">)
  };
};

export const serializeFigureContent = (contentValue: unknown): string => {
  const content = validateFigureContent(contentValue);
  const serialized = JSON.stringify(definitionObject(content), null, 2).replace(/^\{\n/, "{\n  card,\n");
  return `import card from ${JSON.stringify(content.identity.cardImport)};\nimport { defineFigure } from "../../define-figure";\n\nexport default defineFigure(${serialized});\n`;
};

const typescriptDiagnostics = (source: string, filename: string): readonly ts.Diagnostic[] =>
  ts.transpileModule(source, {
    fileName: filename,
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
  }).diagnostics ?? [];

const definitionFromSource = (source: string, filename: string): { readonly cardImport: string; readonly value: Record<string, unknown> } => {
  const parsed = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  if (typescriptDiagnostics(source, filename).length) throw new Error(`Cannot parse ${filename} as TypeScript.`);
  let cardImport: string | undefined;
  let definition: ts.ObjectLiteralExpression | undefined;
  for (const statement of parsed.statements) {
    if (ts.isImportDeclaration(statement) && statement.importClause?.name?.text === "card" && ts.isStringLiteral(statement.moduleSpecifier)) {
      cardImport = statement.moduleSpecifier.text;
    }
    if (ts.isExportAssignment(statement) && ts.isCallExpression(statement.expression) && statement.expression.arguments.length === 1) {
      const argument = statement.expression.arguments[0];
      if (argument && ts.isObjectLiteralExpression(argument)) definition = argument;
    }
  }
  if (!cardImport || !definition) throw new Error(`Unsupported figure definition structure in ${filename}.`);
  return { cardImport, value: literalValue(definition) as Record<string, unknown> };
};

export const parseFigureContent = (source: string, filename: string, slug: string): FigureContentDto => {
  const { cardImport, value } = definitionFromSource(source, filename);
  const move = record(value.move, "move", []);
  const guides = record(value.guides, "guides", []);
  const youtube = record(value.youtube, "youtube", []);
  const resources = record(value.resources ?? {}, "resources", []);
  const cardLinks = Array.isArray(youtube.cardLinks) ? youtube.cardLinks.map((resource) => ({ type: "youtube", ...(resource as Record<string, unknown>) })) : [];
  const webLinks = Array.isArray(resources.cardLinks) ? resources.cardLinks.map((resource) => ({ type: "web", ...(resource as Record<string, unknown>) })) : [];
  return validateFigureContent({
    identity: {
      id: move.id,
      style: move.style,
      slug,
      order: value.order,
      cardImport
    },
    basics: {
      name: move.name,
      alias: move.alias,
      family: move.family,
      count: move.count,
      motion: move.motion,
      end: move.end,
      familiarity: move.familiarity,
      flows: move.flows
    },
    guides,
    teachingSources: youtube.teachingSources ?? [],
    cardResources: [...cardLinks, ...webLinks]
  });
};

export const readFigureContentFile = async (path: string, slug: string): Promise<LoadedFigureContent> => {
  const source = await readFile(path, "utf8");
  return { content: parseFigureContent(source, path, slug), revision: revisionFor(source) };
};

const validateTeachingFrames = async (content: FigureContentDto, definitionPath: string): Promise<void> => {
  const issues: ContentValidationIssue[] = [];
  for (const [index, source] of content.teachingSources.entries()) {
    if (!source.frame) continue;
    try {
      await access(resolve(dirname(definitionPath), source.frame));
    } catch {
      issues.push({ path: `teachingSources.${index}.frame`, message: "Referenced teaching frame does not exist." });
    }
  }
  if (issues.length) throw new ContentValidationError(issues);
};

export const saveFigureContentFile = async (
  path: string,
  expectedIdentity: FigureIdentityDto,
  expectedRevision: string,
  value: unknown
): Promise<LoadedFigureContent> => {
  const currentSource = await readFile(path, "utf8");
  if (revisionFor(currentSource) !== expectedRevision) throw new ContentConflictError();
  const content = validateFigureContent(value);
  if (JSON.stringify(content.identity) !== JSON.stringify(expectedIdentity)) {
    throw new ContentValidationError([{ path: "identity", message: "Figure identity and asset fields are read-only." }]);
  }
  await validateTeachingFrames(content, path);
  const nextSource = serializeFigureContent(content);
  if (typescriptDiagnostics(nextSource, path).length) throw new Error("Generated figure source is not valid TypeScript.");
  const temporaryPath = `${path}.${process.pid}.${Date.now()}.tmp`;
  try {
    await writeFile(temporaryPath, nextSource, { flag: "wx" });
    await rename(temporaryPath, path);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
  return { content, revision: revisionFor(nextSource) };
};
