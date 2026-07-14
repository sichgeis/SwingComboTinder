import { loadEnvFile } from "node:process";
import { resolve } from "node:path";

import { repositoryRoot } from "./paths";
import { logLevels, type LogLevel } from "./logger";
import { imageQualities, type ImageQuality } from "./types";

export interface ImageEnvironment {
  readonly litellmApiKey: string | undefined;
  readonly litellmBaseUrl: string | undefined;
  readonly model: string;
  readonly imageSize: string;
  readonly imageQuality: ImageQuality;
  readonly requestTimeoutMs: number;
  readonly studioPort: number;
  readonly logLevel: LogLevel;
}

const normalizeLiteLLMBaseUrl = (value: string | undefined): string | undefined => {
  if (value === undefined || value.trim() === "") return undefined;
  const normalized = value.trim().replace(/\/+$/, "");
  return normalized.endsWith("/v1") ? normalized.slice(0, -3) : normalized;
};

const positiveNumber = (value: string | undefined, fallback: number, name: string): number => {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${name} must be a positive number.`);
  return parsed;
};

const imageSize = (value: string | undefined): string => {
  const size = value ?? "1024x1536";
  const match = /^(\d+)x(\d+)$/.exec(size);
  if (!match) throw new Error("IMAGE_SIZE must use WIDTHxHEIGHT, for example 1024x1536.");
  const width = Number(match[1]);
  const height = Number(match[2]);
  const pixels = width * height;
  if (
    width % 16 !== 0 ||
    height % 16 !== 0 ||
    Math.max(width, height) > 3840 ||
    Math.max(width, height) / Math.min(width, height) > 3 ||
    pixels < 655_360 ||
    pixels > 8_294_400
  ) {
    throw new Error("IMAGE_SIZE does not satisfy the GPT Image 2 dimension constraints.");
  }
  return size;
};

export const loadEnvironment = (path = resolve(repositoryRoot, ".env")): void => {
  try {
    loadEnvFile(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
};

export const getImageEnvironment = (): ImageEnvironment => {
  const quality = process.env.IMAGE_QUALITY ?? "medium";
  if (!imageQualities.includes(quality as ImageQuality)) {
    throw new Error("IMAGE_QUALITY must be low, medium, or high.");
  }
  const studioPort = positiveNumber(process.env.IMAGE_STUDIO_PORT, 4174, "IMAGE_STUDIO_PORT");
  if (!Number.isInteger(studioPort) || studioPort > 65_535) {
    throw new Error("IMAGE_STUDIO_PORT must be an integer from 1 to 65535.");
  }
  const logLevel = process.env.IMAGE_STUDIO_LOG_LEVEL?.toLowerCase() ?? "info";
  if (!logLevels.includes(logLevel as LogLevel)) {
    throw new Error("IMAGE_STUDIO_LOG_LEVEL must be error, warn, info, or debug.");
  }

  return {
    litellmApiKey: process.env.LITELLM_API_KEY,
    litellmBaseUrl: normalizeLiteLLMBaseUrl(process.env.LITELLM_BASE_URL),
    model: process.env.IMAGE_MODEL ?? "gpt-image-2",
    imageSize: imageSize(process.env.IMAGE_SIZE),
    imageQuality: quality as ImageQuality,
    requestTimeoutMs:
      positiveNumber(process.env.REQUEST_TIMEOUT_SECONDS, 300, "REQUEST_TIMEOUT_SECONDS") * 1000,
    studioPort,
    logLevel: logLevel as LogLevel
  };
};
