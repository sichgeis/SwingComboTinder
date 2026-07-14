import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { promptTemplatePath } from "./paths";
import type { FigureRecord } from "./types";

const INPUT_ASSIGNMENT = `Image 1 is the authoritative teaching frame. Preserve its full-body pose, weight placement, foot positions, facing directions, handholds, spacing, and composition. Images 2–4 are style references only. Use their illustration technique, palette, lighting, clothing treatment, texture, and background atmosphere. Do not copy their people, poses, or composition.`;

const extractUniversalPrompt = (markdown: string): string => {
  const marker = "## Universal prompt";
  const start = markdown.indexOf(marker);
  if (start < 0) throw new Error(`${promptTemplatePath} is missing "${marker}".`);
  return markdown
    .slice(start + marker.length)
    .trim()
    .split(/\r?\n/)
    .map((line) => line.replace(/^> ?/, ""))
    .join("\n")
    .replaceAll("**", "")
    .trim();
};

export const buildPrompt = async (figure: FigureRecord): Promise<string> => {
  if (!figure.poseDirection || !figure.characterDirection) {
    throw new Error(`${figure.id} needs Pose direction and Character direction in notes.md.`);
  }
  const template = extractUniversalPrompt(await readFile(promptTemplatePath, "utf8"));
  const body = template
    .replace("[MOVE NAME]", figure.name)
    .replace("[PASTE FROM THE MOVE'S `notes.md`]", figure.poseDirection)
    .replace("[PASTE FROM THE MOVE'S `notes.md`]", figure.characterDirection);
  return `${INPUT_ASSIGNMENT}\n\n${body}`;
};

export const hashText = (value: string): string =>
  createHash("sha256").update(value).digest("hex");
