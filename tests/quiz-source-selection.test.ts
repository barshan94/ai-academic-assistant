import { describe, expect, it } from "vitest";
import {
  getPreselectedQuizSourceIds,
  getQuizQuestionsForSubject,
  type QuizSourceQuestion,
  type QuizSourceImportance,
} from "@/lib/quiz-source-selection";

const questions: QuizSourceQuestion[] = [
  { id: "p1", question_number: "1", question_text: "Physics core", subject: "Physics", chapter: "Motion" },
  { id: "c1", question_number: "2", question_text: "Chemistry core", subject: "Chemistry", chapter: "Atoms" },
  { id: "p2", question_number: "3", question_text: "Physics medium", subject: "Physics", chapter: "Forces" },
  { id: "p3", question_number: "4", question_text: "Physics high", subject: "Physics", chapter: "Energy" },
];

const importance: QuizSourceImportance[] = [
  { question_id: "p1", importance_level: "core" },
  { question_id: "p2", importance_level: "medium" },
  { question_id: "p3", importance_level: "high" },
  { question_id: "c1", importance_level: "core" },
];

describe("quiz source subject selection", () => {
  it("shows only approved questions from the selected subject", () => {
    expect(getQuizQuestionsForSubject(questions, "Physics").map((question) => question.id))
      .toEqual(["p1", "p2", "p3"]);
  });

  it("preselects important questions for the chosen subject in priority order", () => {
    expect(getPreselectedQuizSourceIds(questions, importance, "Physics"))
      .toEqual(["p1", "p3", "p2"]);
    expect(getPreselectedQuizSourceIds(questions, importance, "Chemistry"))
      .toEqual(["c1"]);
  });

  it("does not preselect questions from another subject", () => {
    expect(getPreselectedQuizSourceIds(questions, importance, "Physics"))
      .not.toContain("c1");
  });

  it("limits automatic preselection to twenty questions", () => {
    const manyQuestions = Array.from({ length: 25 }, (_, index) => ({
      id: `q${index}`,
      question_number: String(index + 1),
      question_text: "Question",
      subject: "Physics",
      chapter: null,
    }));
    const manyMarks = manyQuestions.map((question) => ({
      question_id: question.id,
      importance_level: "core",
    }));
    expect(getPreselectedQuizSourceIds(manyQuestions, manyMarks, "Physics")).toHaveLength(20);
  });
});
