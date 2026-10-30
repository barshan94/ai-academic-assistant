import { describe, expect, it } from "vitest";
import { examAnswerSchema, parseExamAnswer } from "@/lib/ai/answer-schema";

const valid = {
  examAnswer: "F = ma",
  workingSteps: [{ step: "1", explanation: "Substitute the values." }],
  calculationChecks: [{ expression: "2 * 3", claimedResult: 6, unit: "N" }],
  bengaliExplanation: "নিউটনের দ্বিতীয় সূত্র।",
  englishExplanation: "Newton's second law.",
  keyConcepts: ["Force"],
  assumptions: [],
  limitations: [],
};

describe("academic answer schema", () => {
  it("accepts a complete answer including explicit arithmetic checks", () => {
    expect(examAnswerSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing bilingual explanations and invalid step structures", () => {
    expect(examAnswerSchema.safeParse({ ...valid, bengaliExplanation: "" }).success).toBe(false);
    expect(examAnswerSchema.safeParse({ ...valid, workingSteps: [{ step: "1" }] }).success).toBe(false);
  });

  it("requires the arithmetic-check field and bounds output sizes", () => {
    const { calculationChecks: _checks, ...withoutChecks } = valid;
    expect(examAnswerSchema.safeParse(withoutChecks).success).toBe(false);
    expect(examAnswerSchema.safeParse({ ...valid, examAnswer: "x".repeat(20001) }).success).toBe(false);
    expect(examAnswerSchema.safeParse({ ...valid, keyConcepts: Array(21).fill("concept") }).success).toBe(false);
  });

  it("parses JSON without accepting malformed content", () => {
    expect(parseExamAnswer(JSON.stringify(valid))).toEqual(valid);
    expect(() => parseExamAnswer("not-json")).toThrow();
  });
});
