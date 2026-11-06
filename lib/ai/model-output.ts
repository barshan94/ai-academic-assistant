import { z } from "zod";

const assistantOutputSchema = z.object({
  answer: z.string().min(20).max(30000),
  subject: z.string().max(100).nullable().optional(),
  qualification: z.string().max(100).nullable().optional(),
  chapter: z.string().max(150).nullable().optional(),
  topic: z.string().max(150).nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
});

export type AssistantOutput = z.infer<typeof assistantOutputSchema>;

/**
 * Providers may return strict JSON, fenced JSON, or plain text.
 * Keep plain-text answers usable, but never fabricate classification metadata.
 */
export function parseAssistantOutput(raw: string): AssistantOutput {
  const cleaned = raw.trim().replace(/^\x60\x60\x60(?:json)?\s*/i, "").replace(/\s*\x60\x60\x60$/, "");
  try {
    const parsed: unknown = JSON.parse(cleaned);
    const result = assistantOutputSchema.safeParse(parsed);
    if (result.success) return result.data;
  } catch {
    // Fall back to plain text below.
  }
  return { answer: raw.slice(0, 30000) };
}
