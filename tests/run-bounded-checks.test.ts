import { describe, expect, it } from "vitest";
import { runBoundedChecks } from "@/lib/health/run-bounded-checks";

describe("runBoundedChecks", () => {
  it("never runs more than the configured number of checks concurrently", async () => {
    let active = 0;
    let maximumActive = 0;

    const result = await runBoundedChecks(
      [1, 2, 3, 4, 5, 6, 7, 8, 9],
      3,
      async () => {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        await Promise.resolve();
        active -= 1;
        return true;
      },
    );

    expect(result).toBe(true);
    expect(maximumActive).toBe(3);
    expect(active).toBe(0);
  });

  it("stops before starting later batches after a failed check", async () => {
    const checked: number[] = [];

    const result = await runBoundedChecks([1, 2, 3, 4, 5], 2, async (item) => {
      checked.push(item);
      return item !== 2;
    });

    expect(result).toBe(false);
    expect(checked).toEqual([1, 2]);
  });

  it("rejects invalid batch sizes", async () => {
    await expect(runBoundedChecks([1], 0, async () => true)).rejects.toThrow(
      "batchSize must be a positive integer",
    );
  });
});
