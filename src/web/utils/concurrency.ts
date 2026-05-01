export async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  const queue = [...items];

  const runners = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) {
        return;
      }

      const result = await worker(next);
      results.push(result);
    }
  });

  await Promise.all(runners);
  return results;
}
