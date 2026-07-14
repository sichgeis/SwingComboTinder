import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const figuresRoot = resolve(repositoryRoot, "figures");
export const imageGenerationRoot = resolve(repositoryRoot, "image-generation");
export const promptTemplatePath = resolve(imageGenerationRoot, "PROMPT.md");
export const styleReferencePaths = [
  resolve(imageGenerationRoot, "references/01-swingout-open.png"),
  resolve(imageGenerationRoot, "references/02-inside-turn.png"),
  resolve(imageGenerationRoot, "references/03-charleston-kick-throughs.png")
] as const;
