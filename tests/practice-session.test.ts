import { describe, expect, it } from "vitest";
import { getPracticeProgress, shufflePracticeQuestions, type PracticeQuestion } from "@/lib/chapters/practice-session";

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
      percent: 67,
    });
  });

  it("handles empty progress without dividing by zero", () => {
    expect(getPracticeProgress(0, new Set(), [])).toEqual({
      total: 0,
      attempted: 0,
      remaining: 0,
      percent: 0,
    });
  });
});
