import { describe, expect, it } from "vitest";
import { bulkClassificationReviewSchema } from "@/lib/questions/bulk-classification-review";

const first = "11111111-1111-4111-8111-111111111111";
const second = "22222222-2222-4222-8222-222222222222";

describe("bulk classification review", () => {
  it("accepts a bounded batch and a non-confirming review status", () => {
    expect(bulkClassificationReviewSchema.safeParse({
      questionIds: [first, second],
      targetStatus: "uncertain",
    }).success).toBe(true);
  });

  it("rejects an empty batch, duplicate IDs, invalid IDs and confirmation", () => {
    for (const value of [
      { questionIds: [], targetStatus: "uncertain" },
      { questionIds: [first, first], targetStatus: "unreviewed" },
      { questionIds: ["not-a-uuid"], targetStatus: "uncertain" },
      { questionIds: [first], targetStatus: "confirmed" },
    ]) {
      expect(bulkClassificationReviewSchema.safeParse(value).success).toBe(false);
    }
  });

  it("rejects more than 50 selected questions", () => {
    const ids = Array.from({ length: 51 }, (_, index) =>
      `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`);
    expect(bulkClassificationReviewSchema.safeParse({
      questionIds: ids,
      targetStatus: "uncertain",
    }).success).toBe(false);
  });
});
