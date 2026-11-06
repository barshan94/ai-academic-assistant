import { z } from "zod";

const optionalText = z.string().trim().max(120).transform((value) => value || null);

export const questionCreateSchema = z.object({
  documentId: z.string().uuid(),
  documentPageId: z.string().uuid(),
  questionText: z.string().trim().min(1).max(20000),
  questionNumber: z.string().trim().max(40).transform((value) => value || null),
  board: optionalText,
  qualification: optionalText,
  subject: optionalText,
  chapter: optionalText,
  topic: optionalText,
});
