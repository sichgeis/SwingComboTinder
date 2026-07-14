interface UpdateEventTarget {
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

interface VisibilityEventTarget extends UpdateEventTarget {
  readonly visibilityState: DocumentVisibilityState;
}

interface UpdateRegistration {
  update(): Promise<unknown>;
}

export const watchForServiceWorkerUpdates = (
  registration: UpdateRegistration,
  visibilityTarget: VisibilityEventTarget = document,
  focusTarget: UpdateEventTarget = window
): (() => void) => {
  let updateInFlight = false;

  const checkForUpdate: EventListener = () => {
    if (visibilityTarget.visibilityState !== "visible" || updateInFlight) return;
    updateInFlight = true;
    void registration.update()
      .catch(() => undefined)
      .finally(() => { updateInFlight = false; });
  };

  visibilityTarget.addEventListener("visibilitychange", checkForUpdate);
  focusTarget.addEventListener("focus", checkForUpdate);

  return () => {
    visibilityTarget.removeEventListener("visibilitychange", checkForUpdate);
    focusTarget.removeEventListener("focus", checkForUpdate);
  };
};
