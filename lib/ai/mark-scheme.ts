import { z } from "zod";

const markPointSchema = z.object({
  id: z.string().trim().min(1).max(40),
  description: z.string().trim().min(1).max(1000),
  keyPhrases: z.array(z.string().trim().min(1).max(120)).max(12).default([]),
  marks: z.number().int().min(0).max(20).optional(),
});

export const markSchemeSchema = z.object({
  title: z.string().trim().min(1).max(200),
  awardingBody: z.string().trim().min(1).max(100),
  qualification: z.string().trim().min(1).max(100),
  subject: z.string().trim().min(1).max(100),
  paperReference: z.string().trim().max(100).optional(),
  sourceUrl: z.string().url().refine((value) => new URL(value).protocol === "https:", "Use an HTTPS source URL."),
  sourceLocator: z.string().trim().min(1).max(160),
  sourceDocumentVersion: z.string().trim().max(100).optional(),
  points: z.array(markPointSchema).min(1).max(80),
}).superRefine((scheme, context) => {
  const ids = new Set<string>();
  scheme.points.forEach((point, index) => {
    if (ids.has(point.id)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["points", index, "id"], message: "Mark point IDs must be unique." });
    ids.add(point.id);
  });
});

export type MarkScheme = z.infer<typeof markSchemeSchema>;
export type MarkPointReview = {
  id: string;
  description: string;
  marks?: number;
  matchedPhrases: string[];
  status: "possible_match" | "not_found" | "manual_review";
};

/**
 * Produces a conservative review checklist, not an examiner mark or correctness verdict.
 * Phrase presence can be coincidental; absent phrases may be expressed using different wording.
 */
export function compareAnswerToMarkScheme(answer: string, scheme: MarkScheme): MarkPointReview[] {
  const normalizedAnswer = normalize(answer);
  return scheme.points.map((point) => {
    if (!point.keyPhrases.length) {
      return { id: point.id, description: point.description, marks: point.marks, matchedPhrases: [], status: "manual_review" };
    }
    const matchedPhrases = point.keyPhrases.filter((phrase) => {
      const normalizedPhrase = normalize(phrase);
      return normalizedPhrase.length > 0 && (` ${normalizedAnswer} `).includes(` ${normalizedPhrase} `);
    });
    return {
      id: point.id,
      description: point.description,
      marks: point.marks,
      matchedPhrases,
      status: matchedPhrases.length ? "possible_match" : "not_found",
    };
  });
}

function normalize(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}
