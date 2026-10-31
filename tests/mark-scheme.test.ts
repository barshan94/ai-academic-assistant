import { describe, expect, it } from "vitest";
import { compareAnswerToMarkScheme, markSchemeSchema } from "@/lib/ai/mark-scheme";

const scheme = {
  title: "Physics Paper 1 Mark Scheme",
  awardingBody: "Example Board",
  qualification: "A Level",
  subject: "Physics",
  paperReference: "P1",
  sourceUrl: "https://example.org/mark-scheme.pdf",
  points: [
    { id: "M1", description: "Use the force equation", keyPhrases: ["resultant force", "mass times acceleration"], marks: 1 },
    { id: "A1", description: "Give the final unit", keyPhrases: ["newton"], marks: 1 },
    { id: "B1", description: "Explain the relationship", keyPhrases: [], marks: 1 },
  ],
};

describe("mark scheme review checklist", () => {
  it("identifies literal key-phrase presence without awarding marks", () => {
    const result = compareAnswerToMarkScheme("The resultant force equals mass times acceleration.", scheme);
    expect(result[0].status).toBe("possible_match");
    expect(result[0].matchedPhrases).toEqual(["resultant force"]);
    expect(result[1].status).toBe("not_found");
    expect(result[2].status).toBe("manual_review");
    expect(result).not.toHaveProperty("score");
  });

  it("normalizes case, punctuation and Unicode compatibility", () => {
    const result = compareAnswerToMarkScheme("RESULTANT-FORCE is proportional.", scheme);
    expect(result[0].matchedPhrases).toContain("resultant force");
  });

  it("rejects duplicate mark-point IDs and non-HTTPS source URLs", () => {
    expect(markSchemeSchema.safeParse({ ...scheme, points: [scheme.points[0], scheme.points[0]] }).success).toBe(false);
    expect(markSchemeSchema.safeParse({ ...scheme, sourceUrl: "http://example.org/file.pdf" }).success).toBe(false);
  });

  it("rejects empty or oversized mark schemes", () => {
    expect(markSchemeSchema.safeParse({ ...scheme, points: [] }).success).toBe(false);
    expect(markSchemeSchema.safeParse({ ...scheme, points: Array(81).fill(scheme.points[0]) }).success).toBe(false);
  });
});
