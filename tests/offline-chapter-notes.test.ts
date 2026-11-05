import { describe, expect, it } from "vitest";
import { buildOfflineChapterNote } from "@/lib/ai/offline-chapter-notes";

const sources = [{
  ref: "S1",
  questionId: "question-1",
  questionNumber: "2(a)",
  questionText: "Explain how resultant force affects acceleration.",
  pageId: "page-1",
  pageNumber: 4,
  extractionMethod: "pdf_text",
  pageText: "Newton's second law: F = ma\nAcceleration is measured in m/s^2.",
}];

describe("free offline chapter-note builder", () => {
  it("creates a source-linked draft without claiming to solve or verify content", () => {
    const note = buildOfflineChapterNote({
      board: "Cambridge",
      qualification: "A Level",
      subject: "Physics",
      chapter: "Forces",
      sources,
    });
    expect(note.title).toContain("Forces");
    expect(note.concepts).toEqual(["Explain how resultant force affects acceleration. [S1]"]);
    expect(note.formulas).toEqual(["Newton's second law: F = ma [S1]"]);
    expect(note.workedExamples).toEqual([]);
    expect(note.revisionPrompts[0]).toContain("question 2(a)");
    expect(note.sourceReferences).toEqual([{
      ref: "S1",
      questionId: "question-1",
      pageId: "page-1",
      pageNumber: 4,
      extractionMethod: "pdf_text",
    }]);
    expect(note.summary).toContain("does not generate explanations");
    expect(note.summary).toContain("does not");
  });

  it("deduplicates repeated candidate expressions and keeps the 12-source limit", () => {
    const note = buildOfflineChapterNote({
      board: "Edexcel",
      qualification: "A Level",
      subject: "Maths",
      chapter: "Algebra",
      sources: [
        ...sources,
        { ...sources[0], ref: "S2", questionId: "question-2", pageText: "F = ma\nF = ma" },
      ],
    });
    expect(note.formulas).toEqual(["Newton's second law: F = ma [S1]", "F = ma [S2]"]);
    expect(() => buildOfflineChapterNote({
      board: "x", qualification: "x", subject: "x", chapter: "x",
      sources: Array.from({ length: 13 }, (_, index) => ({ ...sources[0], ref: "S" + (index + 1), questionId: "q" + index })),
    })).toThrow("OFFLINE_NOTE_SOURCES_INVALID");
  });

  it("rejects malformed or duplicate source references", () => {
    expect(() => buildOfflineChapterNote({
      board: "x", qualification: "x", subject: "x", chapter: "x",
      sources: [{ ...sources[0], ref: "S1" }, { ...sources[0], ref: "S1", questionId: "question-2" }],
    })).toThrow("OFFLINE_NOTE_SOURCE_INVALID");
  });
});
