export type QuizSourceQuestion = {
  id: string;
  question_number: number | string | null;
  question_text: string;
  subject: string | null;
  chapter: string | null;
};

export type QuizSourceImportance = {
  question_id: string;
  importance_level: string;
};

const importanceRank: Record<string, number> = { core: 3, high: 2, medium: 1 };

export function getQuizQuestionsForSubject(
  questions: QuizSourceQuestion[],
  subject: string,
): QuizSourceQuestion[] {
  return questions.filter((question) => question.subject === subject);
}

export function getPreselectedQuizSourceIds(
  questions: QuizSourceQuestion[],
  importanceMarks: QuizSourceImportance[],
  subject: string,
): string[] {
  const importantIds = new Set(importanceMarks.map((mark) => mark.question_id));
  return getQuizQuestionsForSubject(questions, subject)
    .filter((question) => importantIds.has(question.id))
    .sort((a, b) => {
      const rankA = importanceMarks.find((mark) => mark.question_id === a.id)?.importance_level ?? "";
      const rankB = importanceMarks.find((mark) => mark.question_id === b.id)?.importance_level ?? "";
      return (importanceRank[rankB] ?? 0) - (importanceRank[rankA] ?? 0);
    })
    .slice(0, 20)
    .map((question) => question.id);
}
