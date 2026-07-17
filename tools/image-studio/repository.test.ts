import { mkdir, mkdtemp, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";
import sharp from "sharp";

import {
  addTeachingPose,
  discoverFigures,
  MAX_TEACHING_POSE_UPLOAD_BYTES,
  swapTeachingPose
} from "./repository";
import type { FigureRecord } from "./types";

const poseFixture = async (): Promise<{ readonly figure: FigureRecord; readonly selected: string; readonly alternative: string }> => {
  const directory = await mkdtemp(resolve(tmpdir(), "swing-pose-"));
  const teachingFrames = resolve(directory, "teaching-frames");
  await mkdir(teachingFrames);
  const selected = resolve(teachingFrames, "selected.png");
  const alternative = resolve(teachingFrames, "alternative.png");
  await writeFile(selected, "selected-pixels");
  await writeFile(alternative, "alternate-pixels");
  return {
    selected,
    alternative,
    figure: {
      id: "lindy/test",
      style: "lindy",
      slug: "test",
      name: "Test",
      directory,
      notesPath: resolve(directory, "notes.md"),
      definitionPath: resolve(directory, "figure.ts"),
      posePath: selected,
      currentPath: resolve(directory, "generated/current.png"),
      fallbackPath: resolve(directory, "card.jpg"),
      hasPose: true,
      hasCurrent: false,
      hasFallback: false,
      marked: false,
      imageApproved: false,
      poseDirection: "",
      characterDirection: "",
      generationNote: "",
      poseOptions: [
        { absolutePath: selected, relativePath: "teaching-frames/selected.png", filename: "selected.png", selected: true },
        { absolutePath: alternative, relativePath: "teaching-frames/alternative.png", filename: "alternative.png", selected: false }
      ],
      candidates: []
    }
  };
};

describe("discoverFigures", () => {
  it("discovers the full repository catalog and its generation readiness", async () => {
    const figures = await discoverFigures();
    expect(figures).toHaveLength(42);
    expect(figures.filter(({ style }) => style === "lindy")).toHaveLength(28);
    expect(figures.filter(({ style }) => style === "charleston")).toHaveLength(6);
    expect(figures.filter(({ style }) => style === "shag")).toHaveLength(8);
    expect(figures.filter(({ hasPose }) => hasPose)).toHaveLength(34);
    expect(figures.filter(({ hasCurrent }) => hasCurrent)).toHaveLength(34);
    expect(figures.find(({ id }) => id === "charleston/side-charleston")?.generationNote).not.toBe("");
    expect(figures.find(({ id }) => id === "lindy/texas-tommy")?.poseOptions).toHaveLength(3);
    expect(figures.find(({ id }) => id === "lindy/tuck-turn")?.poseOptions).toHaveLength(1);
  });

  it("swaps a selected teaching pose with a known alternate and can swap it back", async () => {
    const { figure, selected, alternative } = await poseFixture();

    await swapTeachingPose(figure, "teaching-frames/alternative.png");
    expect(await readFile(selected, "utf8")).toBe("alternate-pixels");
    expect(await readFile(alternative, "utf8")).toBe("selected-pixels");

    await swapTeachingPose(figure, "teaching-frames/alternative.png");
    expect(await readFile(selected, "utf8")).toBe("selected-pixels");
    expect(await readFile(alternative, "utf8")).toBe("alternate-pixels");
  });

  it("rejects unknown pose paths without changing either image", async () => {
    const { figure, selected, alternative } = await poseFixture();

    await expect(swapTeachingPose(figure, "../outside.png")).rejects.toThrow("known alternate PNG");
    expect(await readFile(selected, "utf8")).toBe("selected-pixels");
    expect(await readFile(alternative, "utf8")).toBe("alternate-pixels");
  });

  it("normalizes an uploaded image to a safely named PNG alternative", async () => {
    const { figure, selected } = await poseFixture();
    const jpeg = await sharp({
      create: { width: 40, height: 60, channels: 3, background: "#bada55" }
    }).jpeg().toBuffer();

    const added = await addTeachingPose(figure, jpeg, "../../Copied Screenshot.JPG", "image/jpeg");

    expect(added).toMatchObject({ selected: false });
    expect(added.filename).toMatch(/^copied-screenshot-\d{14}-[a-f0-9]{8}\.png$/);
    expect(added.relativePath).toBe(`teaching-frames/${added.filename}`);
    expect(await readFile(selected, "utf8")).toBe("selected-pixels");
    expect(await sharp(resolve(figure.directory, added.relativePath)).metadata()).toMatchObject({
      format: "png",
      width: 40,
      height: 60
    });
  });

  it("installs the first uploaded image as selected.png", async () => {
    const { figure, selected } = await poseFixture();
    await unlink(selected);
    const webp = await sharp({
      create: { width: 30, height: 45, channels: 4, background: "#123456" }
    }).webp().toBuffer();

    const added = await addTeachingPose(figure, webp, "first.webp", "image/webp");

    expect(added).toEqual({
      relativePath: "teaching-frames/selected.png",
      filename: "selected.png",
      selected: true
    });
    expect(await sharp(selected).metadata()).toMatchObject({ format: "png", width: 30, height: 45 });
  });

  it("rejects unsupported or unreadable uploads without creating a pose", async () => {
    const { figure } = await poseFixture();
    const teachingFrames = resolve(figure.directory, "teaching-frames");

    await expect(addTeachingPose(figure, Buffer.from("not-an-image"), "pose.gif", "image/gif"))
      .rejects.toThrow("PNG, JPEG, or WebP");
    await expect(addTeachingPose(figure, Buffer.from("not-an-image"), "pose.png", "image/png"))
      .rejects.toThrow("not a readable");
    await expect(addTeachingPose(
      figure,
      Buffer.alloc(MAX_TEACHING_POSE_UPLOAD_BYTES + 1),
      "huge.png",
      "image/png"
    )).rejects.toThrow("no larger than 20 MB");
    expect((await readdir(teachingFrames)).sort()).toEqual(["alternative.png", "selected.png"]);
  });
});
