import { randomUUID } from "node:crypto";
import { mkdir, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import sharp from "sharp";

import { moveStyles, type MoveStyle } from "../../src/domain/move";
import { readFigureContentFile, serializeFigureContent } from "./content";
import type { ContentValidationIssue, FigureContentDto, LoadedFigureContent } from "./content";
import { figuresRoot } from "./paths";

export interface CreateFigureRequest {
  readonly name: string;
  readonly style: MoveStyle;
  readonly slug: string;
}

export class FigureCreationError extends Error {
  public constructor(public readonly issues: readonly ContentValidationIssue[]) {
    super("New card details are invalid.");
    this.name = "FigureCreationError";
  }
}

interface ExistingFigure {
  readonly id: string;
  readonly order: number;
}

interface CreateFigureDependencies {
  readonly writePlaceholder?: (path: string, name: string) => Promise<void>;
}

const directoryExists = async (path: string): Promise<boolean> => stat(path).then(() => true, () => false);

const existingFigures = async (root: string): Promise<readonly ExistingFigure[]> => {
  const found: ExistingFigure[] = [];
  for (const style of moveStyles) {
    const styleDirectory = resolve(root, style);
    const entries = await readdir(styleDirectory, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
      const definitionPath = join(styleDirectory, entry.name, "figure.ts");
      try {
        const { content } = await readFigureContentFile(definitionPath, entry.name);
        found.push({ id: content.identity.id, order: content.identity.order });
      } catch (error) {
        if (await directoryExists(definitionPath)) throw error;
      }
    }
  }
  return found;
};

const defaultsFor = (style: MoveStyle): Pick<FigureContentDto["basics"], "family" | "count" | "motion"> => {
  if (style === "charleston") return { family: "charleston", count: "eight", motion: "travel" };
  if (style === "shag") return { family: "shag-rhythm", count: "six", motion: "linear" };
  return { family: "linear", count: "six-or-eight", motion: "linear" };
};

const xml = (value: string): string => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const defaultWritePlaceholder = async (path: string, name: string): Promise<void> => {
  const displayName = name.length > 30 ? `${name.slice(0, 27)}…` : name;
  const artwork = `<svg width="600" height="900" viewBox="0 0 600 900" xmlns="http://www.w3.org/2000/svg">
    <rect width="600" height="900" fill="#071720"/>
    <circle cx="510" cy="105" r="180" fill="#123343"/>
    <circle cx="70" cy="820" r="215" fill="#102a35"/>
    <path d="M64 238 H536 M64 662 H536" stroke="#72cef1" stroke-width="3" opacity=".55"/>
    <text x="300" y="390" fill="#72cef1" font-family="Arial, sans-serif" font-size="34" font-weight="700" text-anchor="middle" letter-spacing="8">DRAFT</text>
    <text x="300" y="476" fill="#f4efe5" font-family="Georgia, serif" font-size="45" font-weight="700" text-anchor="middle">${xml(displayName)}</text>
    <text x="300" y="530" fill="#9aadb7" font-family="Arial, sans-serif" font-size="20" text-anchor="middle">Artwork needed</text>
  </svg>`;
  await sharp(Buffer.from(artwork)).jpeg({ quality: 86 }).toFile(path);
};

const notesFor = (name: string): string => `# ${name}

## Artwork status

- [ ] Card artwork installed
- [ ] Image approved
- [x] Needs rework
- Production card: \`card.jpg\` (draft placeholder)
- Full-resolution source: Not generated.
- Created as a Studio draft.

## Pose direction

Add the teaching-pose direction before generating artwork.

## Character direction

Add the character direction before generating artwork.

## Teaching sources

Add teaching-source provenance here.

## Working notes

Replace the provisional bilingual guide and placeholder artwork before publishing.
`;

export const createFigurePackage = async (
  value: unknown,
  root = figuresRoot,
  dependencies: CreateFigureDependencies = {}
): Promise<{ readonly id: string; readonly loaded: LoadedFigureContent }> => {
  const source = typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const name = typeof source.name === "string" ? source.name.trim() : "";
  const style = source.style;
  const slug = typeof source.slug === "string" ? source.slug.trim() : "";
  const issues: ContentValidationIssue[] = [];
  if (!name) issues.push({ path: "name", message: "Enter a canonical name." });
  else if (name.length > 100) issues.push({ path: "name", message: "Use at most 100 characters." });
  if (typeof style !== "string" || !moveStyles.some((candidate) => candidate === style)) {
    issues.push({ path: "style", message: "Choose a supported dance style." });
  }
  if (!slug) issues.push({ path: "slug", message: "Enter a slug." });
  else if (slug.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    issues.push({ path: "slug", message: "Use lowercase letters, numbers, and single hyphens." });
  }
  if (issues.length) throw new FigureCreationError(issues);

  const parsedStyle = style as MoveStyle;
  const styleDirectory = resolve(root, parsedStyle);
  if (!await directoryExists(styleDirectory)) throw new FigureCreationError([{ path: "style", message: "The style directory does not exist." }]);
  const destination = resolve(styleDirectory, slug);
  const existing = await existingFigures(root);
  if (existing.some((figure) => figure.id === slug)) issues.push({ path: "slug", message: "That stable ID is already used." });
  if (await directoryExists(destination)) issues.push({ path: "slug", message: "That figure directory already exists." });
  if (issues.length) throw new FigureCreationError(issues);

  const order = Math.max(0, ...existing.map((figure) => figure.order)) + 1;
  const defaults = defaultsFor(parsedStyle);
  const content: FigureContentDto = {
    publication: "draft",
    identity: {
      id: slug,
      style: parsedStyle,
      slug,
      order,
      cardImport: "./card.jpg?w=600&h=900&format=webp&quality=80"
    },
    basics: { name, ...defaults, end: { kind: "any" } },
    guides: {
      en: {
        description: `Draft description for ${name}.`,
        body: "## Draft guide\n\nReplace this provisional English guide before publishing.",
        remember: "Add the final memory cue before publishing."
      },
      de: {
        description: `Entwurfsbeschreibung für ${name}.`,
        body: "## Entwurfsanleitung\n\nErsetze diese vorläufige deutsche Anleitung vor der Veröffentlichung.",
        remember: "Ergänze vor der Veröffentlichung den finalen Merksatz."
      }
    },
    cardResources: []
  };

  const temporary = resolve(styleDirectory, `.${slug}.${randomUUID()}.tmp`);
  const writePlaceholder = dependencies.writePlaceholder ?? defaultWritePlaceholder;
  try {
    await mkdir(temporary);
    await Promise.all([
      mkdir(resolve(temporary, "teaching-frames")),
      mkdir(resolve(temporary, "generated"))
    ]);
    const writes = await Promise.allSettled([
      writeFile(resolve(temporary, "figure.ts"), serializeFigureContent(content), { flag: "wx" }),
      writeFile(resolve(temporary, "notes.md"), notesFor(name), { flag: "wx" }),
      writePlaceholder(resolve(temporary, "card.jpg"), name)
    ]);
    const failedWrite = writes.find((result): result is PromiseRejectedResult => result.status === "rejected");
    if (failedWrite) throw failedWrite.reason;
    await rename(temporary, destination);
  } catch (error) {
    await rm(temporary, { recursive: true, force: true });
    throw error;
  }
  return {
    id: `${parsedStyle}/${slug}`,
    loaded: await readFigureContentFile(resolve(destination, "figure.ts"), slug)
  };
};
