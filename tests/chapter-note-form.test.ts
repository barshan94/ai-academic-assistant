import { describe, expect, it } from "vitest";
import {
  parseChapterNoteDraftInput,
  parseChapterNoteGenerationInput,
  parseChapterNoteStatusInput,
} from "@/lib/chapters/note-form";

const catalogId = "00000000-0000-4000-8000-000000000001";
const chapterId = "00000000-0000-4000-8000-000000000002";
const noteId = "00000000-0000-4000-8000-000000000003";

const validDraft = {
  catalogId,
  chapterId,
  title: "Mechanics",
  summary: "Core ideas",
  concepts: "Force\nMotion",
  formulas: "F = ma",
  workedExamples: "A 2 kg object accelerates at 3 m/s²",
  revisionPrompts: "Define resultant force",
  questionIds: [noteId],
  documentPageIds: [],
  supersedesId: "",
};

describe("chapter note form validation", () => {
  it("accepts valid owner-authored note data", () => {
    expect(parseChapterNoteDraftInput(validDraft).success).toBe(true);
  });

  it("rejects File values in note text, metadata and source ID arrays", () => {
    expect(parseChapterNoteDraftInput({ ...validDraft, title: new File(["x"], "title.txt") }).success).toBe(false);
    expect(parseChapterNoteDraftInput({ ...validDraft, summary: new File(["x"], "summary.txt") }).success).toBe(false);
    expect(parseChapterNoteDraftInput({ ...validDraft, questionIds: [new File(["x"], "source.txt")] }).success).toBe(false);
    expect(parseChapterNoteDraftInput({ ...validDraft, documentPageIds: [new File(["x"], "page.txt")] }).success).toBe(false);
  });

  it("rejects File values in AI generation identifiers", () => {
    expect(parseChapterNoteGenerationInput({
      catalogId: new File(["x"], "catalog.txt"),
      chapterId,
      supersedesId: "",
    }).success).toBe(false);
  });

  it("rejects File values in approval status updates", () => {
    expect(parseChapterNoteStatusInput({ noteId, status: new File(["approved"], "status.txt") }).success).toBe(false);
    expect(parseChapterNoteStatusInput({ noteId: new File(["x"], "id.txt"), status: "approved" }).success).toBe(false);
  });
});
