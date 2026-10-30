import { z } from "zod";

export const examAnswerSchema = z.object({
  examAnswer: z.string().trim().min(1).max(20000),
  workingSteps: z.array(z.object({
    step: z.string().trim().min(1).max(300),
    explanation: z.string().trim().min(1).max(3000),
  })).max(30),
  bengaliExplanation: z.string().trim().min(1).max(12000),
  englishExplanation: z.string().trim().min(1).max(12000),
  keyConcepts: z.array(z.string().trim().min(1).max(300)).max(20),
  assumptions: z.array(z.string().trim().min(1).max(500)).max(20),
  limitations: z.array(z.string().trim().min(1).max(500)).max(20),
});

export type ExamAnswer = z.infer<typeof examAnswerSchema>;

export function parseExamAnswer(raw: string): ExamAnswer {
  const cleaned = raw.trim()
    .replace(/^\uFEFF/, "")
    .replace(/^\x60{3}(?:json)?\s*/i, "")
    .replace(/\s*\x60{3}$/i, "");
  const parsed: unknown = JSON.parse(cleaned);
  return examAnswerSchema.parse(parsed);
}
