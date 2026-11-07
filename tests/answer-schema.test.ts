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
  tips: ["Check units before substituting."],
  shortcuts: [],
  alternativeMethods: [],
  commonMistakes: ["Confusing mass and weight."],
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

  it("requires reasoning steps in new AI answers while preserving legacy saved drafts", () => {
    const conceptualWithoutSteps = { ...valid, workingSteps: [] };
    expect(examAnswerSchema.safeParse(conceptualWithoutSteps).success).toBe(true);
    expect(() => parseExamAnswer(JSON.stringify(conceptualWithoutSteps))).toThrow();
  });

  it("requires explicit verification arrays and bounds output sizes", () => {
    expect(examAnswerSchema.safeParse({ ...valid, chemistryChecks: undefined }).success).toBe(false);
    expect(examAnswerSchema.safeParse({ ...valid, examAnswer: "x".repeat(20001) }).success).toBe(false);
    expect(examAnswerSchema.safeParse({ ...valid, keyConcepts: Array(21).fill("concept") }).success).toBe(false);
  });

  it("backfills new study-guidance fields for older saved answers", () => {
    const legacy = { ...valid };
    delete (legacy as Partial<typeof valid>).tips;
    delete (legacy as Partial<typeof valid>).shortcuts;
    delete (legacy as Partial<typeof valid>).alternativeMethods;
    delete (legacy as Partial<typeof valid>).commonMistakes;
    const parsed = examAnswerSchema.parse(legacy);
    expect(parsed.tips).toEqual([]);
    expect(parsed.shortcuts).toEqual([]);
    expect(parsed.alternativeMethods).toEqual([]);
    expect(parsed.commonMistakes).toEqual([]);
  });

  it("bounds each generated study-guidance list", () => {
    expect(examAnswerSchema.safeParse({ ...valid, tips: Array(13).fill("tip") }).success).toBe(false);
    expect(examAnswerSchema.safeParse({ ...valid, shortcuts: ["x".repeat(501)] }).success).toBe(false);
  });

  it("parses JSON without accepting malformed content", () => {
    expect(parseExamAnswer(JSON.stringify(valid))).toEqual(valid);
    expect(() => parseExamAnswer("not-json")).toThrow();
  });
});
