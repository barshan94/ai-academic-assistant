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

export function getPracticeProgress(total: number, attempted: ReadonlySet<string>, queue: readonly PracticeQuestion[]) {
  const validIds = new Set(queue.map((question) => question.id));
  let attemptedCount = 0;
  for (const id of attempted) if (validIds.has(id)) attemptedCount += 1;
  return {
    total,
    attempted: attemptedCount,
    remaining: Math.max(0, total - attemptedCount),
    percent: total > 0 ? Math.round((attemptedCount / total) * 100) : 0,
  };
}
