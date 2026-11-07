export type StudyPriorityChapter = { id: string; sort_order: number | null };

export function rankStudyPriorityChapters<T extends StudyPriorityChapter>(
  chapters: T[],
  topicsByChapter: Map<string, Array<{ id: string }>>,
  questionsByTopic: Map<string, unknown[]>,
  questionsByChapter: Map<string, unknown[]>,
): T[] {
  return [...chapters].sort((a, b) => {
    const aTopicIds = topicsByChapter.get(a.id) ?? [];
    const bTopicIds = topicsByChapter.get(b.id) ?? [];
    const aUncovered = aTopicIds.filter((topic) => !(questionsByTopic.get(topic.id)?.length)).length;
    const bUncovered = bTopicIds.filter((topic) => !(questionsByTopic.get(topic.id)?.length)).length;
    const aQuestions = questionsByChapter.get(a.id)?.length ?? 0;
    const bQuestions = questionsByChapter.get(b.id)?.length ?? 0;
    return Number(aQuestions > 0) - Number(bQuestions > 0)
      || bUncovered - aUncovered
      || (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
}
