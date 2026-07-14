import { describe, expect, it, vi } from "vitest";

import { watchForServiceWorkerUpdates } from "./service-worker-updates";

class VisibilityTarget extends EventTarget {
  visibilityState: DocumentVisibilityState = "hidden";
}

describe("watchForServiceWorkerUpdates", () => {
  it("checks on foreground activity, deduplicates requests, and can be removed", async () => {
    const visibilityTarget = new VisibilityTarget();
    const focusTarget = new EventTarget();
    let finishUpdate: (() => void) | undefined;
    const update = vi.fn(() => new Promise<void>((resolve) => { finishUpdate = resolve; }));
    const stopWatching = watchForServiceWorkerUpdates(
      { update },
      visibilityTarget,
      focusTarget
    );

    focusTarget.dispatchEvent(new Event("focus"));
    expect(update).not.toHaveBeenCalled();

    visibilityTarget.visibilityState = "visible";
    visibilityTarget.dispatchEvent(new Event("visibilitychange"));
    focusTarget.dispatchEvent(new Event("focus"));
    expect(update).toHaveBeenCalledTimes(1);

    finishUpdate?.();
    await Promise.resolve();
    await Promise.resolve();
    focusTarget.dispatchEvent(new Event("focus"));
    expect(update).toHaveBeenCalledTimes(2);

    stopWatching();
    visibilityTarget.dispatchEvent(new Event("visibilitychange"));
    expect(update).toHaveBeenCalledTimes(2);
  });
});
