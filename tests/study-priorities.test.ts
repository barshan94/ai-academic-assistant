import { describe, expect, it } from "vitest";
import { rankStudyPriorityChapters } from "@/lib/study/priorities";

describe("study priority ranking", () => {
  it("puts chapters with no approved questions first, then the largest topic coverage gaps", () => {
    const chapters = [
      { id: "covered", sort_order: 1 },
      { id: "gap-one", sort_order: 2 },
      { id: "no-questions", sort_order: 3 },
      { id: "gap-two", sort_order: 4 },
    ];
    const topicsByChapter = new Map([
      ["covered", [{ id: "t1" }]],
      ["gap-one", [{ id: "t2" }, { id: "t3" }]],
      ["no-questions", [{ id: "t4" }]],
      ["gap-two", [{ id: "t5" }, { id: "t6" }, { id: "t7" }]],
    ]);
    const questionsByTopic = new Map([
      ["t1", [{}]],
      ["t2", [{}]],
    ]);
    const questionsByChapter = new Map([
      ["covered", [{}]],
      ["gap-one", [{}]],
      ["gap-two", [{}]],
    ]);

    expect(rankStudyPriorityChapters(chapters, topicsByChapter, questionsByTopic, questionsByChapter)
      .map((chapter) => chapter.id)).toEqual(["no-questions", "gap-two", "gap-one", "covered"]);
  });

  it("does not mutate the original chapter ordering", () => {
    const chapters = [{ id: "b", sort_order: 2 }, { id: "a", sort_order: 1 }];
    const ranked = rankStudyPriorityChapters(chapters, new Map(), new Map(), new Map());
    expect(ranked.map((chapter) => chapter.id)).toEqual(["a", "b"]);
    expect(chapters.map((chapter) => chapter.id)).toEqual(["b", "a"]);
  });
});
