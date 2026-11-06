import { describe, expect, it } from "vitest";
import { examAnswerSchema, parseExamAnswer } from "@/lib/ai/answer-schema";

const valid = {
  examAnswer: "F = ma",
  workingSteps: [{ step: "1", explanation: "Substitute the values." }],
  calculationChecks: [{ expression: "2 * 3", claimedResult: 6, unit: "N" }],
  chemistryChecks: [],
  physicsChecks: [{ formulaUnit: "kg*m/s^2", claimedUnit: "N" }],
  bengaliExplanation: "নিউটনের দ্বিতীয় সূত্র।",
  englishExplanation: "Newton's second law.",
  keyConcepts: ["Force"],
  assumptions: [],
  limitations: [],
};

describe("academic answer schema", () => {
  it("accepts a complete answer including both verification payloads", () => {
    expect(examAnswerSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing bilingual explanations and invalid step structures", () => {
    expect(examAnswerSchema.safeParse({ ...valid, bengaliExplanation: "" }).success).toBe(false);
    expect(examAnswerSchema.safeParse({ ...valid, workingSteps: [{ step: "1" }] }).success).toBe(false);
  });

  it("requires explicit verification arrays and bounds output sizes", () => {
    expect(examAnswerSchema.safeParse({ ...valid, chemistryChecks: undefined }).success).toBe(false);
    expect(examAnswerSchema.safeParse({ ...valid, examAnswer: "x".repeat(20001) }).success).toBe(false);
    expect(examAnswerSchema.safeParse({ ...valid, keyConcepts: Array(21).fill("concept") }).success).toBe(false);
  });

  it("parses JSON without accepting malformed content", () => {
    expect(parseExamAnswer(JSON.stringify(valid))).toEqual(valid);
    expect(() => parseExamAnswer("not-json")).toThrow();
  });
});
