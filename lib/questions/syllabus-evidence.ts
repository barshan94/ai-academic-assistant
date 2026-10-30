import { z } from "zod";

export const syllabusEvidenceInputSchema = z.object({
  catalogId: z.string().uuid(),
  chapterId: z.string().uuid(),
  topicId: z.string().uuid().or(z.literal("")),
  sourceUrl: z.string().trim().url().max(2048).refine((value) => {
    try { return new URL(value).protocol === "https:"; }
    catch { return false; }
  }),
  sourceTitle: z.string().trim().min(1).max(200),
  sourceLocator: z.string().trim().max(200),
  evidenceExcerpt: z.string().trim().max(600),
});

export function parseSyllabusEvidenceInput(value: unknown) {
  return syllabusEvidenceInputSchema.safeParse(value);
}
