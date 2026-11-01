import { z } from "zod";

export const bulkClassificationReviewSchema = z.object({
  questionIds: z.array(z.string().uuid()).min(1).max(50)
    .refine((ids) => new Set(ids).size === ids.length, "Duplicate question IDs are not allowed."),
  targetStatus: z.enum(["unreviewed", "uncertain"]),
});
