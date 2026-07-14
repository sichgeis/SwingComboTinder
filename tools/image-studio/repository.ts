import { access, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";

import { figuresRoot, repositoryRoot } from "./paths";
import { MAX_GENERATION_NOTE_LENGTH } from "./prompt";
import type { CandidateImage, FigureRecord } from "./types";

const exists = async (path: string): Promise<boolean> => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

const readSection = (markdown: string, heading: string): string => {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start < 0) return "";
  const content: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("## ")) break;
    content.push(line);
  }
  return content.join("\n").trim();
};

const writeSection = (markdown: string, heading: string, content: string): string => {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const headingLine = `## ${heading}`;
  const start = lines.findIndex((line) => line.trim() === headingLine);
  const replacement = [headingLine, "", ...content.trim().split("\n"), ""];

  if (start >= 0) {
    const nextHeading = lines.findIndex((line, index) => index > start && line.startsWith("## "));
    const end = nextHeading < 0 ? lines.length : nextHeading;
    lines.splice(start, end - start, ...replacement);
  } else {
    const workingNotes = lines.findIndex((line) => line.trim() === "## Working notes");
    const insertion = workingNotes < 0 ? lines.length : workingNotes;
    lines.splice(insertion, 0, ...replacement);
  }

  return `${lines.join("\n").trimEnd()}\n`;
};

const discoverCandidates = async (directory: string): Promise<readonly CandidateImage[]> => {
  const candidatesRoot = resolve(directory, "generated/candidates");
  if (!(await exists(candidatesRoot))) return [];

  const runDirectories = await readdir(candidatesRoot, { withFileTypes: true });
  const candidates: CandidateImage[] = [];
  for (const runDirectory of runDirectories) {
    if (!runDirectory.isDirectory()) continue;
    const runPath = resolve(candidatesRoot, runDirectory.name);
    for (const entry of await readdir(runPath, { withFileTypes: true })) {
      if (!entry.isFile() || !/^candidate-\d+\.png$/.test(entry.name)) continue;
      const absolutePath = resolve(runPath, entry.name);
      const details = await stat(absolutePath);
      candidates.push({
        absolutePath,
        relativePath: relative(repositoryRoot, absolutePath).split("\\").join("/"),
        createdAt: details.mtime.toISOString(),
        runId: runDirectory.name
      });
    }
  }
  return candidates.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
};

export const discoverFigures = async (): Promise<readonly FigureRecord[]> => {
  const styles = await readdir(figuresRoot, { withFileTypes: true });
  const figures: FigureRecord[] = [];

  for (const styleEntry of styles) {
    if (!styleEntry.isDirectory()) continue;
    const style = styleEntry.name;
    const styleDirectory = resolve(figuresRoot, style);
    const moves = await readdir(styleDirectory, { withFileTypes: true });
    for (const moveEntry of moves) {
      if (!moveEntry.isDirectory()) continue;
      const directory = resolve(styleDirectory, moveEntry.name);
      const notesPath = resolve(directory, "notes.md");
      const definitionPath = resolve(directory, "figure.ts");
      if (!(await exists(notesPath)) || !(await exists(definitionPath))) continue;

      const markdown = await readFile(notesPath, "utf8");
      const name = /^#\s+(.+)$/m.exec(markdown)?.[1]?.trim() ?? moveEntry.name;
      const posePath = resolve(directory, "teaching-frames/selected.png");
      const currentPath = resolve(directory, "generated/current.png");
      const fallbackPath = resolve(directory, "card.jpg");
      figures.push({
        id: `${style}/${moveEntry.name}`,
        style,
        slug: moveEntry.name,
        name,
        directory,
        notesPath,
        definitionPath,
        posePath,
        currentPath,
        fallbackPath,
        hasPose: await exists(posePath),
        hasCurrent: await exists(currentPath),
        hasFallback: await exists(fallbackPath),
        marked: /^- \[[xX]\] Needs rework\s*$/m.test(markdown),
        imageApproved: /^- \[[xX]\] Image approved\s*$/m.test(markdown),
        poseDirection: readSection(markdown, "Pose direction"),
        characterDirection: readSection(markdown, "Character direction"),
        generationNote: readSection(markdown, "Generation note"),
        candidates: await discoverCandidates(directory)
      });
    }
  }

  return figures.sort((left, right) => left.id.localeCompare(right.id));
};

export const setGenerationNote = async (figure: FigureRecord, note: string): Promise<void> => {
  const normalized = note.trim();
  if (normalized.length > MAX_GENERATION_NOTE_LENGTH) {
    throw new Error(`Generation note must be at most ${MAX_GENERATION_NOTE_LENGTH} characters.`);
  }
  const source = await readFile(figure.notesPath, "utf8");
  await writeFile(figure.notesPath, writeSection(source, "Generation note", normalized));
};

export const findFigure = async (id: string): Promise<FigureRecord> => {
  const figure = (await discoverFigures()).find((item) => item.id === id);
  if (!figure) throw new Error(`Unknown figure: ${id}`);
  return figure;
};
