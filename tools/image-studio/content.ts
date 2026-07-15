import { createHash } from "node:crypto";
import { access, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import ts from "typescript";

import {
  ContentValidationError,
  figureDefinitionDataFromContent,
  validateFigureContent
} from "./content-model";
import type {
  ContentValidationIssue,
  FigureContentDto,
  FigureIdentityDto,
  LoadedFigureContent
} from "./content-model";

export * from "./content-model";

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

export const serializeFigureContent = (contentValue: unknown): string => {
  const content = validateFigureContent(contentValue);
  const serialized = JSON.stringify(figureDefinitionDataFromContent(content), null, 2).replace(/^\{\n/, "{\n  card,\n");
  return `import card from ${JSON.stringify(content.identity.cardImport)};\nimport { defineFigure } from "../../define-figure";\n\nexport default defineFigure(${serialized});\n`;
};

const sourceRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

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
  const move = sourceRecord(value.move);
  const guides = sourceRecord(value.guides);
  const youtube = sourceRecord(value.youtube);
  const resources = sourceRecord(value.resources ?? {});
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
