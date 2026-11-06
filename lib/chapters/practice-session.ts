export type PracticeQuestion = {
  id: string;
  questionNumber: string | null;
  questionText: string;
};

export function shufflePracticeQuestions<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const sample = random();
    if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
      throw new Error("PRACTICE_RANDOM_SOURCE_INVALID");
    }
    const swapIndex = Math.floor(sample * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function getPracticeProgress(total: number, attempted: ReadonlySet<string>, queue: readonly PracticeQuestion[], confident: ReadonlySet<string> = new Set()) {
  const validIds = new Set(queue.map((question) => question.id));
  let attemptedCount = 0;
  for (const id of attempted) if (validIds.has(id)) attemptedCount += 1;
  let confidentCount = 0;
  for (const id of confident) if (validIds.has(id) && attempted.has(id)) confidentCount += 1;
  return {
    total,
    attempted: attemptedCount,
    remaining: Math.max(0, total - attemptedCount),
    confident: confidentCount,
    needsReview: Math.max(0, attemptedCount - confidentCount),
    percent: total > 0 ? Math.round((attemptedCount / total) * 100) : 0,
  };
}

export function buildPracticeAnswerSheet(
  chapterTitle: string,
  queue: readonly PracticeQuestion[],
  working: Readonly<Record<string, string>>,
  attempted: ReadonlySet<string>,
  confident: ReadonlySet<string>,
): string {
  const title = chapterTitle.trim().slice(0, 160) || "Chapter practice";
  const lines = [
    title,
    "Personal practice answer sheet",
    "Self-assessment only; answers have not been graded or verified.",
    "",
  ];
  for (const [index, question] of queue.entries()) {
    const status = confident.has(question.id) && attempted.has(question.id)
      ? "Confident"
      : attempted.has(question.id) ? "Needs more practice" : "Not marked attempted";
    lines.push(
      `Question ${index + 1}${question.questionNumber ? ` (${question.questionNumber})` : ""}`,
      question.questionText,
      `Self-assessment: ${status}`,
      "Your working:",
      working[question.id]?.trim() || "(No working entered)",
      "",
      "----------------------------------------",
      "",
    );
  }
  return lines.join("\n");
}

export function buildPracticeAnswerFilename(chapterTitle: string): string {
  const safeName = chapterTitle
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  return `${safeName || "chapter"}-practice-answers.txt`;
}
