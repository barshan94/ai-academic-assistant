/**
 * Run independent health checks in bounded batches.
 *
 * Keeping the batch size small prevents a readiness request from opening a
 * burst of concurrent connections against a small/free database instance.
 * A failed batch short-circuits later probes; no result includes table data.
 */
export async function runBoundedChecks<T>(
  items: readonly T[],
  batchSize: number,
  check: (item: T) => Promise<boolean>,
): Promise<boolean> {
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new RangeError("batchSize must be a positive integer");
  }

  for (let offset = 0; offset < items.length; offset += batchSize) {
    const batch = items.slice(offset, offset + batchSize);
    const results = await Promise.all(batch.map(check));
    if (results.some((result) => !result)) return false;
  }

  return true;
}
