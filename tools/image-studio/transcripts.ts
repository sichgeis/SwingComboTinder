import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";

import { repositoryRoot } from "./paths";

const downloaderPath = resolve(repositoryRoot, "tools/transcripts/download_transcripts.py");
const MAX_COMMAND_OUTPUT_BYTES = 1_000_000;
const DOWNLOAD_TIMEOUT_MS = 75_000;

interface TranscriptFigure {
  readonly id: string;
  readonly directory: string;
}

interface CommandResult {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}

export interface TranscriptFile {
  readonly filename: string;
  readonly path: string;
}

export interface TranscriptImportResult extends TranscriptFile {
  readonly status: "written" | "unchanged";
  readonly videoId: string;
  readonly title: string;
  readonly channel: string;
  readonly message: string;
}

export type TranscriptCommand = (args: readonly string[]) => Promise<CommandResult>;

const runDownloader: TranscriptCommand = (args) => new Promise((resolveCommand, reject) => {
  const child = spawn("python3", [downloaderPath, ...args], {
    cwd: repositoryRoot,
    stdio: ["ignore", "pipe", "pipe"]
  });
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  let outputSize = 0;
  let settled = false;
  const fail = (error: Error): void => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    reject(error);
  };
  const timer = setTimeout(() => {
    child.kill("SIGTERM");
    fail(new Error("Transcript download timed out after 75 seconds."));
  }, DOWNLOAD_TIMEOUT_MS);
  const collect = (target: Buffer[], chunk: Buffer): void => {
    outputSize += chunk.length;
    if (outputSize > MAX_COMMAND_OUTPUT_BYTES) {
      child.kill("SIGTERM");
      fail(new Error("Transcript downloader returned too much command output."));
      return;
    }
    target.push(chunk);
  };
  child.stdout.on("data", (chunk: Buffer) => collect(stdout, chunk));
  child.stderr.on("data", (chunk: Buffer) => collect(stderr, chunk));
  child.on("error", (error) => fail(error));
  child.on("close", (code) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    resolveCommand({
      code: code ?? 1,
      stdout: Buffer.concat(stdout).toString("utf8"),
      stderr: Buffer.concat(stderr).toString("utf8")
    });
  });
});

export const listTranscriptFiles = async (figure: TranscriptFigure): Promise<readonly TranscriptFile[]> => {
  const root = resolve(figure.directory, "transcripts");
  try {
    return (await readdir(root, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
      .map((entry) => ({
        filename: entry.name,
        path: relative(repositoryRoot, resolve(root, entry.name)).split("\\").join("/")
      }))
      .sort((left, right) => left.filename.localeCompare(right.filename));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
};

export const importYouTubeTranscript = async (
  figure: TranscriptFigure,
  url: string,
  command: TranscriptCommand = runDownloader
): Promise<TranscriptImportResult> => {
  const normalizedUrl = url.trim();
  if (!normalizedUrl) throw new Error("Paste a YouTube URL.");
  if (normalizedUrl.length > 2_000) throw new Error("The YouTube URL is too long.");

  const commandResult = await command([
    "--figure", figure.id,
    "--json",
    "--title-filename",
    "--",
    normalizedUrl
  ]);
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(commandResult.stdout) as Record<string, unknown>;
  } catch {
    throw new Error(commandResult.stderr.trim() || "The transcript downloader returned an unreadable response.");
  }
  const result = Array.isArray(payload.results) ? payload.results[0] as Record<string, unknown> | undefined : undefined;
  if (!result || result.status === "failed" || commandResult.code !== 0) {
    throw new Error(
      (typeof result?.message === "string" && result.message)
      || (typeof payload.error === "string" && payload.error)
      || commandResult.stderr.trim()
      || "The transcript could not be downloaded."
    );
  }
  if ((result.status !== "written" && result.status !== "unchanged") || typeof result.path !== "string") {
    throw new Error("The transcript downloader returned an invalid result.");
  }
  const transcriptsRoot = resolve(figure.directory, "transcripts");
  const absolutePath = resolve(result.path);
  if (!absolutePath.startsWith(`${transcriptsRoot}${sep}`)) {
    throw new Error("The transcript downloader returned a path outside the selected figure.");
  }
  return {
    status: result.status,
    videoId: typeof result.videoId === "string" ? result.videoId : "",
    title: typeof result.title === "string" ? result.title : "",
    channel: typeof result.channel === "string" ? result.channel : "",
    message: typeof result.message === "string" ? result.message : "",
    filename: absolutePath.split(sep).at(-1) ?? "transcript.md",
    path: relative(repositoryRoot, absolutePath).split("\\").join("/")
  };
};
