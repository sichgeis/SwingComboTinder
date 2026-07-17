import { stat } from "node:fs/promises";
import { relative } from "node:path";

import { repositoryRoot } from "./paths";

export const versionedMediaUrl = async (absolutePath: string): Promise<string> => {
  const details = await stat(absolutePath, { bigint: true });
  const path = relative(repositoryRoot, absolutePath).split("\\").join("/");
  const version = [details.mtimeNs, details.ctimeNs, details.size, details.ino]
    .map((value) => value.toString(36))
    .join("-");
  return `/media?path=${encodeURIComponent(path)}&v=${version}`;
};
