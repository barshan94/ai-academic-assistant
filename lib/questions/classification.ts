import { z } from "zod";

export const questionClassificationSchema = z.object({
  questionId: z.string().uuid(),
  catalogId: z.union([z.string().uuid(), z.literal("")]),
  chapterId: z.union([z.string().uuid(), z.literal("")]),
  topicId: z.union([z.string().uuid(), z.literal("")]),
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
  if (!values.catalogId && (values.chapterId || values.topicId)) {
    context.addIssue({
      code: "custom",
      path: ["catalogId"],
      message: "A chapter or topic must belong to a selected syllabus version.",
    });
  }
  if (!values.chapterId && values.topicId) {
    context.addIssue({
      code: "custom",
      path: ["chapterId"],
      message: "A topic must belong to a selected chapter.",
    });
  }
  if (values.classificationStatus !== "confirmed" || values.catalogId) return;
  for (const field of ["board", "qualification", "subject", "syllabusVersion"] as const) {
    if (!values[field]) {
      context.addIssue({
        code: "custom",
        path: [field],
        message: "A confirmed manual mapping requires this field or a selected catalogue.",
      });
    }
  }
});
