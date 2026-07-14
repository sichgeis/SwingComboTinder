import { relative } from "node:path";

import { getImageEnvironment, loadEnvironment } from "./environment";
import { generateFigure } from "./generate";
import { mapWithConcurrency } from "./pool";
import { planGeneration } from "./plan";
import { promoteCandidate } from "./promote";
import { discoverFigures } from "./repository";
import {
  generationModes,
  imageQualities,
  type GenerationMode,
  type ImageQuality,
  type SelectionOptions
} from "./types";

interface CliOptions {
  readonly mode: GenerationMode;
  readonly style?: string;
  readonly ids: readonly string[];
  readonly quality: ImageQuality;
  readonly size: string;
  readonly model: string;
  readonly count: number;
  readonly concurrency: number;
  readonly dryRun: boolean;
  readonly promote: boolean;
}

const HELP = `Generate Swing Thing card candidates with OpenAI GPT Image through LiteLLM.

Usage:
  npm run images:generate -- [options]
  task images:generate -- [options]

Options:
  --mode <selected|missing|marked|all>  Figure selection (default: missing)
  --style <lindy|charleston|shag>       Optional style filter
  --ids <style/slug,...>                IDs used by selected mode
  --quality <low|medium|high>           Output quality (default: medium)
  --count <1-4>                         Candidates per figure (default: 1)
  --concurrency <1-6>                   Parallel figure requests (default: 3)
  --model <model>                       LiteLLM model alias (default: IMAGE_MODEL)
  --size <widthxheight>                 Output size (default: IMAGE_SIZE)
  --dry-run                             Print the plan without API calls
  --promote                             Promote the first candidate after each success
  --help                                Show this help
`;

const valueAfter = (args: readonly string[], name: string): string | undefined => {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
};

const integerOption = (
  args: readonly string[],
  name: string,
  fallback: number,
  minimum: number,
  maximum: number
): number => {
  const raw = valueAfter(args, name);
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} to ${maximum}.`);
  }
  return value;
};

const parseOptions = (args: readonly string[]): CliOptions => {
  const environment = getImageEnvironment();
  if (args.includes("--help")) {
    console.log(HELP);
    process.exit(0);
  }
  const rawMode = valueAfter(args, "--mode") ?? "missing";
  if (!generationModes.includes(rawMode as GenerationMode)) {
    throw new Error(`Unknown mode: ${rawMode}`);
  }
  const rawQuality = valueAfter(args, "--quality") ?? environment.imageQuality;
  if (!imageQualities.includes(rawQuality as ImageQuality)) {
    throw new Error(`Unknown quality: ${rawQuality}`);
  }
  const rawIds = valueAfter(args, "--ids") ?? "";
  const style = valueAfter(args, "--style");
  return {
    mode: rawMode as GenerationMode,
    ...(style === undefined ? {} : { style }),
    ids: rawIds.split(",").map((id) => id.trim()).filter(Boolean),
    quality: rawQuality as ImageQuality,
    size: valueAfter(args, "--size") ?? environment.imageSize,
    model: valueAfter(args, "--model") ?? environment.model,
    count: integerOption(args, "--count", 1, 1, 4),
    concurrency: integerOption(args, "--concurrency", 3, 1, 6),
    dryRun: args.includes("--dry-run"),
    promote: args.includes("--promote")
  };
};

const main = async (): Promise<void> => {
  loadEnvironment();
  const options = parseOptions(process.argv.slice(2));
  const environment = getImageEnvironment();
  const selection: SelectionOptions = {
    mode: options.mode,
    ...(options.style === undefined ? {} : { style: options.style }),
    ...(options.ids.length === 0 ? {} : { ids: options.ids })
  };
  const plan = planGeneration(await discoverFigures(), selection);

  console.log(`Ready: ${plan.ready.length}; blocked: ${plan.blocked.length}`);
  for (const figure of plan.ready) console.log(`  ready    ${figure.id}`);
  for (const figure of plan.blocked) {
    console.log(`  blocked  ${figure.id} (missing teaching-frames/selected.png)`);
  }
  if (options.dryRun) return;
  if (plan.ready.length === 0) {
    if (plan.blocked.length > 0) process.exitCode = 1;
    return;
  }

  let failures = 0;
  await mapWithConcurrency(plan.ready, options.concurrency, async (figure) => {
    console.log(`Generating ${figure.id}…`);
    try {
      const result = await generateFigure(figure, {
        model: options.model,
        quality: options.quality,
        size: options.size,
        count: options.count,
        timeoutMs: environment.requestTimeoutMs
      }, {
        apiKey: environment.litellmApiKey,
        baseUrl: environment.litellmBaseUrl
      });
      console.log(
        `Created ${result.candidates.length} candidate(s) for ${figure.id} in ${(result.durationMs / 1000).toFixed(1)}s.`
      );
      if (options.promote) {
        const candidate = result.candidates[0];
        if (!candidate) throw new Error("Generation returned no promotable candidate.");
        await promoteCandidate(figure, relative(figure.directory, candidate.absolutePath));
        console.log(`Promoted ${candidate.relativePath}.`);
      }
      return true;
    } catch (error) {
      failures += 1;
      console.error(`Failed ${figure.id}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  });

  if (failures > 0 || plan.blocked.length > 0) process.exitCode = 1;
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
