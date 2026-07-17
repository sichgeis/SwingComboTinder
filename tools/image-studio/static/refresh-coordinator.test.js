import { describe, expect, it, vi } from "vitest";

import { createRefreshCoordinator } from "./refresh-coordinator.js";

describe("createRefreshCoordinator", () => {
  it("coalesces overlapping requests and finishes with the latest requested state", async () => {
    let releaseFirst;
    const firstPass = new Promise((resolve) => {
      releaseFirst = resolve;
    });
    const refresh = vi.fn(async () => {
      if (refresh.mock.calls.length === 1) await firstPass;
    });
    const coordinatedRefresh = createRefreshCoordinator(refresh);

    const initial = coordinatedRefresh("lindy/first");
    const overlapping = coordinatedRefresh("lindy/second");
    coordinatedRefresh("lindy/second", "lindy/third");
    releaseFirst();
    await Promise.all([initial, overlapping]);

    expect(refresh.mock.calls).toEqual([
      [["lindy/first"]],
      [["lindy/second", "lindy/third"]]
    ]);
  });
});
