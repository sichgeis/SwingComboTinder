import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { promoteCandidate, setImageApproved } from "./promote";
import type { FigureRecord } from "./types";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(async (path) => rm(path, { recursive: true })));
});

describe("promoteCandidate", () => {
  it("archives the master, installs the candidate, updates the import, and clears rework", async () => {
    const directory = await mkdtemp(resolve(tmpdir(), "image-studio-promote-"));
    temporaryDirectories.push(directory);
    const generated = resolve(directory, "generated");
    const candidateDirectory = resolve(generated, "candidates/run-1");
    await mkdir(candidateDirectory, { recursive: true });
    await writeFile(resolve(generated, "current.png"), "old");
    await writeFile(resolve(candidateDirectory, "candidate-1.png"), "new");
    await writeFile(
      resolve(directory, "figure.ts"),
      'import card from "./generated/current.png?w=600&h=900&format=webp&quality=80";\n'
    );
    await writeFile(
      resolve(directory, "notes.md"),
      "# Test\n\n## Artwork status\n\n- [x] Card artwork installed\n- [x] Needs rework\n- Full-resolution source: old\n"
    );

    const figure: FigureRecord = {
      id: "lindy/test",
      style: "lindy",
      slug: "test",
      name: "Test",
      directory,
      notesPath: resolve(directory, "notes.md"),
      definitionPath: resolve(directory, "figure.ts"),
      posePath: resolve(directory, "teaching-frames/selected.png"),
      currentPath: resolve(generated, "current.png"),
      fallbackPath: resolve(directory, "card.jpg"),
      hasPose: true,
      hasCurrent: true,
      hasFallback: true,
      marked: true,
      imageApproved: false,
      poseDirection: "Pose",
      characterDirection: "Characters",
      generationNote: "",
      candidates: []
    };

    await promoteCandidate(figure, "generated/candidates/run-1/candidate-1.png");

    expect(await readFile(figure.currentPath, "utf8")).toBe("new");
    const archive = await readdir(resolve(generated, "archive"));
    expect(archive).toHaveLength(1);
    const archivedMaster = archive[0];
    if (!archivedMaster) throw new Error("Expected an archived master.");
    expect(await readFile(resolve(generated, "archive", archivedMaster), "utf8")).toBe("old");
    expect(await readFile(figure.notesPath, "utf8")).toContain("- [ ] Needs rework");
  });

  it("persists image approval in the artwork status section", async () => {
    const directory = await mkdtemp(resolve(tmpdir(), "image-studio-approval-"));
    temporaryDirectories.push(directory);
    const notesPath = resolve(directory, "notes.md");
    await writeFile(notesPath, "# Test\n\n## Artwork status\n\n- [x] Card artwork installed\n- [ ] Needs rework\n");
    const figure = {
      id: "lindy/test",
      notesPath
    } as FigureRecord;

    await setImageApproved(figure, true);
    expect(await readFile(notesPath, "utf8")).toContain("- [x] Image approved");
    await setImageApproved(figure, false);
    expect(await readFile(notesPath, "utf8")).toContain("- [ ] Image approved");
  });
});
