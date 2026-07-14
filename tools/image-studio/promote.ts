import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { basename, dirname, relative, resolve, sep } from "node:path";

import type { FigureRecord } from "./types";

const safeTimestamp = (): string => new Date().toISOString().replaceAll(":", "-").replace(".", "-");

const updateDefinition = async (figure: FigureRecord): Promise<void> => {
  const source = await readFile(figure.definitionPath, "utf8");
  const updated = source.replace(
    /import card from "\.\/(?:card\.jpg|generated\/current\.png)(\?[^"]*)";/,
    'import card from "./generated/current.png$1";'
  );
  if (updated === source && !source.includes('from "./generated/current.png?')) {
    throw new Error(`Could not update the card import in ${relative(figure.directory, figure.definitionPath)}.`);
  }
  if (updated !== source) await writeFile(figure.definitionPath, updated);
};

const updateNotes = async (figure: FigureRecord): Promise<void> => {
  const source = await readFile(figure.notesPath, "utf8");
  const updated = source
    .replace(/^- \[[ xX]\] Card artwork installed$/m, "- [x] Card artwork installed")
    .replace(/^- \[[xX]\] Needs rework$/m, "- [ ] Needs rework")
    .replace(/^- Full-resolution source:.*$/m, "- Full-resolution source: `generated/current.png`");
  if (updated !== source) await writeFile(figure.notesPath, updated);
};

export const promoteCandidate = async (
  figure: FigureRecord,
  candidateRelativePath: string
): Promise<void> => {
  const candidatesRoot = resolve(figure.directory, "generated/candidates");
  const candidatePath = resolve(figure.directory, candidateRelativePath);
  if (!candidatePath.startsWith(`${candidatesRoot}${sep}`)) {
    throw new Error("Only generated candidates belonging to this figure can be promoted.");
  }

  await mkdir(dirname(figure.currentPath), { recursive: true });
  if (figure.hasCurrent) {
    const archiveDirectory = resolve(figure.directory, "generated/archive");
    await mkdir(archiveDirectory, { recursive: true });
    await copyFile(
      figure.currentPath,
      resolve(archiveDirectory, `${safeTimestamp()}-${basename(figure.currentPath)}`)
    );
  }

  const temporaryPath = `${figure.currentPath}.${randomUUID()}.tmp`;
  await copyFile(candidatePath, temporaryPath);
  await rename(temporaryPath, figure.currentPath);
  await updateDefinition(figure);
  await updateNotes(figure);
};

export const setNeedsRework = async (figure: FigureRecord, marked: boolean): Promise<void> => {
  const source = await readFile(figure.notesPath, "utf8");
  const updated = source.replace(
    /^- \[[ xX]\] Needs rework$/m,
    marked ? "- [x] Needs rework" : "- [ ] Needs rework"
  );
  if (updated === source) throw new Error(`${figure.id} has no Needs rework checkbox.`);
  await writeFile(figure.notesPath, updated);
};
