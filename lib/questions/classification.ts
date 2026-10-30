import { z } from "zod";

export const questionClassificationSchema = z.object({
  questionId: z.string().uuid(),
  board: z.string().trim().max(100),
  qualification: z.string().trim().max(100),
  subject: z.string().trim().max(120),
  syllabusVersion: z.string().trim().max(80),
  chapter: z.string().trim().max(160),
  topic: z.string().trim().max(160),
  classificationStatus: z.enum(["unreviewed", "confirmed", "uncertain"]),
  classificationConfidence: z.preprocess(
    (value) => value === "" || value === null || value === undefined ? null : Number(value),
    z.number().min(0).max(1).nullable(),
  ),
}).superRefine((values, context) => {
  if (values.classificationStatus !== "confirmed") return;
  for (const field of ["board", "qualification", "subject", "syllabusVersion"] as const) {
    if (!values[field]) {
      context.addIssue({
        code: "custom",
        path: [field],
        message: "A confirmed classification requires this field.",
      });
    }
  }
});
