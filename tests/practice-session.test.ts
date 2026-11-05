import { describe, expect, it } from "vitest";
import { buildPracticeAnswerSheet, getPracticeProgress, shufflePracticeQuestions, type PracticeQuestion } from "@/lib/chapters/practice-session";

const questions: PracticeQuestion[] = [
  { id: "q1", questionNumber: "1", questionText: "First question" },
  { id: "q2", questionNumber: "2", questionText: "Second question" },
  { id: "q3", questionNumber: null, questionText: "Third question" },
];

describe("free local practice session helpers", () => {
  it("shuffles without mutating the original question list", () => {
    const original = [...questions];
    const shuffled = shufflePracticeQuestions(questions, () => 0);
    expect(shuffled.map((item) => item.id)).toEqual(["q2", "q3", "q1"]);
    expect(questions).toEqual(original);
    expect(new Set(shuffled.map((item) => item.id)).size).toBe(3);
  });

  it("supports an empty and a single-item queue", () => {
    expect(shufflePracticeQuestions([])).toEqual([]);
    expect(shufflePracticeQuestions([questions[0]], () => 0.5)).toEqual([questions[0]]);
  });

  it("rejects an invalid random source", () => {
    expect(() => shufflePracticeQuestions(questions, () => 1)).toThrow("PRACTICE_RANDOM_SOURCE_INVALID");
    expect(() => shufflePracticeQuestions(questions, () => Number.NaN)).toThrow("PRACTICE_RANDOM_SOURCE_INVALID");
  });

  it("counts only attempted questions that belong to the active queue", () => {
    expect(getPracticeProgress(3, new Set(["q1", "q3", "deleted-question"]), questions)).toEqual({
      total: 3,
      attempted: 2,
      remaining: 1,
      confident: 0,
      needsReview: 2,
      percent: 67,
    });
  });

  it("counts confidence only for attempted questions in the active queue", () => {
    expect(getPracticeProgress(3, new Set(["q1", "q2"]), questions, new Set(["q1", "deleted"]))).toEqual({
      total: 3,
      attempted: 2,
      remaining: 1,
      confident: 1,
      needsReview: 1,
      percent: 67,
    });
  });

  it("exports each question, working and honest self-assessment without grading claims", () => {
    const output = buildPracticeAnswerSheet(
      "Forces and motion",
      questions,
      { q1: "F = ma\\n2 × 3 = 6 N", q3: "Need to review this" },
      new Set(["q1", "q3"]),
      new Set(["q1"]),
    );
    expect(output).toContain("Forces and motion");
    expect(output).toContain("Personal practice answer sheet");
    expect(output).toContain("Self-assessment only; answers have not been graded or verified.");
    expect(output).toContain("2 × 3 = 6 N");
    expect(output).toContain("Self-assessment: Confident");
    expect(output).toContain("Self-assessment: Needs more practice");
    expect(output).toContain("Question 3");
    expect(output).not.toContain("Correct answer");
  });

  it("exports a safe default title and empty-work placeholders", () => {
    const output = buildPracticeAnswerSheet(" ", [questions[0]], {}, new Set(), new Set());
    expect(output.startsWith("Chapter practice\\n")).toBe(true);
    expect(output).toContain("(No working entered)");
    expect(output).toContain("Not marked attempted");
  });

  it("handles empty progress without dividing by zero", () => {
    expect(getPracticeProgress(0, new Set(), [])).toEqual({
      total: 0,
      attempted: 0,
      remaining: 0,
      confident: 0,
      needsReview: 0,
      percent: 0,
    });
  });
});
