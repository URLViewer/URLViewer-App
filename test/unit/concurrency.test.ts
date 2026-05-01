import { describe, expect, it } from "vitest";
import { runWithConcurrency } from "@web/utils/concurrency";

describe("runWithConcurrency", () => {
  it("runs all items", async () => {
    const results = await runWithConcurrency([1, 2, 3, 4], 2, async (value) => value * 2);
    expect(results.sort((a, b) => a - b)).toEqual([2, 4, 6, 8]);
  });
});
