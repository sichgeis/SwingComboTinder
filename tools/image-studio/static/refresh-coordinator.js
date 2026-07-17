export const createRefreshCoordinator = (refresh) => {
  let active = null;
  let refreshRequested = false;
  const pendingKeys = new Set();

  const run = async () => {
    do {
      refreshRequested = false;
      const keys = [...pendingKeys];
      pendingKeys.clear();
      await refresh(keys);
    } while (refreshRequested);
  };

  return (...keys) => {
    refreshRequested = true;
    for (const key of keys) {
      if (key) pendingKeys.add(key);
    }
    if (!active) {
      active = run().finally(() => {
        active = null;
      });
    }
    return active;
  };
};
