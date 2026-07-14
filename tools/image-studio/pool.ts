export const mapWithConcurrency = async <Input, Output>(
  values: readonly Input[],
  concurrency: number,
  worker: (value: Input, index: number) => Promise<Output>
): Promise<readonly Output[]> => {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error("Concurrency must be a positive integer.");
  }
  const results = new Array<Output>(values.length);
  let nextIndex = 0;

  const runWorker = async (): Promise<void> => {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      const value = values[index];
      if (value === undefined) continue;
      results[index] = await worker(value, index);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, async () => runWorker())
  );
  return results;
};
