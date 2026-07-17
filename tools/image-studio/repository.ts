import { randomUUID } from "node:crypto";
import { access, link, mkdir, readdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { basename, extname, relative, resolve } from "node:path";

import sharp from "sharp";

import { figuresRoot, repositoryRoot } from "./paths";
import { MAX_GENERATION_NOTE_LENGTH } from "./prompt";
import type { CandidateImage, FigureRecord, TeachingPoseOption } from "./types";

const exists = async (path: string): Promise<boolean> => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

export const MAX_TEACHING_POSE_UPLOAD_BYTES = 20 * 1024 * 1024;
const MAX_TEACHING_POSE_PIXELS = 40_000_000;
const teachingPoseContentTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export interface AddedTeachingPose {
  readonly relativePath: string;
  readonly filename: string;
  readonly selected: boolean;
}

const safePoseStem = (filename: string): string => {
  const stem = basename(filename, extname(filename))
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return stem || "uploaded-pose";
};

const normalizeTeachingPose = async (content: Buffer, contentType: string): Promise<Buffer> => {
  const normalizedContentType = contentType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  if (!teachingPoseContentTypes.has(normalizedContentType)) {
    throw new Error("Teaching poses must be PNG, JPEG, or WebP images.");
  }
  if (content.length === 0) throw new Error("The uploaded teaching pose is empty.");
  if (content.length > MAX_TEACHING_POSE_UPLOAD_BYTES) {
    throw new Error("Teaching poses must be no larger than 20 MB.");
  }

  const input = sharp(content, { animated: false, limitInputPixels: MAX_TEACHING_POSE_PIXELS });
  const metadata = await input.metadata().catch(() => {
    throw new Error("The uploaded file is not a readable PNG, JPEG, or WebP image.");
  });
  if (!metadata.width || !metadata.height || !["jpeg", "png", "webp"].includes(metadata.format ?? "")) {
    throw new Error("The uploaded file is not a readable PNG, JPEG, or WebP image.");
  }
  if (metadata.width * metadata.height > MAX_TEACHING_POSE_PIXELS) {
    throw new Error("Teaching poses must contain no more than 40 megapixels.");
  }
  return input.rotate().png().toBuffer().catch(() => {
    throw new Error("The uploaded file is not a readable PNG, JPEG, or WebP image.");
  });
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

const discoverTeachingPoses = async (directory: string): Promise<readonly TeachingPoseOption[]> => {
  const root = resolve(directory, "teaching-frames");
  if (!(await exists(root))) return [];
  const entries = await readdir(root, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".png"))
    .map((entry) => ({
      absolutePath: resolve(root, entry.name),
      relativePath: `teaching-frames/${entry.name}`,
      filename: entry.name,
      selected: entry.name === "selected.png"
    }))
    .sort((left, right) => Number(right.selected) - Number(left.selected) || left.filename.localeCompare(right.filename));
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
      const poseOptions = await discoverTeachingPoses(directory);
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
        hasPose: poseOptions.some(({ selected }) => selected),
        hasCurrent: await exists(currentPath),
        hasFallback: await exists(fallbackPath),
        marked: /^- \[[xX]\] Needs rework\s*$/m.test(markdown),
        imageApproved: /^- \[[xX]\] Image approved\s*$/m.test(markdown),
        poseDirection: readSection(markdown, "Pose direction"),
        characterDirection: readSection(markdown, "Character direction"),
        generationNote: readSection(markdown, "Generation note"),
        poseOptions,
        candidates: await discoverCandidates(directory)
      });
    }
  }

  return figures.sort((left, right) => left.id.localeCompare(right.id));
};

const atomicReplace = async (path: string, content: Buffer): Promise<void> => {
  const temporary = `${path}.${randomUUID()}.swap-tmp`;
  try {
    await writeFile(temporary, content, { flag: "wx" });
    await rename(temporary, path);
  } finally {
    await unlink(temporary).catch(() => undefined);
  }
};

export const swapTeachingPose = async (figure: FigureRecord, relativePath: string): Promise<void> => {
  const selected = figure.poseOptions.find((option) => option.selected);
  const alternative = figure.poseOptions.find((option) => !option.selected && option.relativePath === relativePath);
  if (!selected) throw new Error(`${figure.id} has no teaching-frames/selected.png.`);
  if (!alternative) throw new Error("Choose a known alternate PNG teaching pose for this figure.");

  const [selectedContent, alternativeContent] = await Promise.all([
    readFile(selected.absolutePath),
    readFile(alternative.absolutePath)
  ]);
  try {
    await atomicReplace(selected.absolutePath, alternativeContent);
    await atomicReplace(alternative.absolutePath, selectedContent);
  } catch (error) {
    const restored = await Promise.allSettled([
      atomicReplace(selected.absolutePath, selectedContent),
      atomicReplace(alternative.absolutePath, alternativeContent)
    ]);
    if (restored.some((result) => result.status === "rejected")) {
      throw new Error(`Teaching pose swap failed and could not be fully restored: ${error instanceof Error ? error.message : String(error)}`);
    }
    throw error;
  }
};

export const addTeachingPose = async (
  figure: FigureRecord,
  content: Buffer,
  filename: string,
  contentType: string
): Promise<AddedTeachingPose> => {
  const normalized = await normalizeTeachingPose(content, contentType);
  const teachingFrames = resolve(figure.directory, "teaching-frames");
  await mkdir(teachingFrames, { recursive: true });
  const hasSelectedPose = await exists(resolve(teachingFrames, "selected.png"));
  const suffix = `${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}-${randomUUID().slice(0, 8)}`;
  const outputFilename = hasSelectedPose ? `${safePoseStem(filename)}-${suffix}.png` : "selected.png";
  const outputPath = resolve(teachingFrames, outputFilename);
  const temporary = resolve(teachingFrames, `.${randomUUID()}.upload-tmp`);

  try {
    await writeFile(temporary, normalized, { flag: "wx" });
    await link(temporary, outputPath);
  } finally {
    await unlink(temporary).catch(() => undefined);
  }

  return {
    relativePath: `teaching-frames/${outputFilename}`,
    filename: outputFilename,
    selected: !hasSelectedPose
  };
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
