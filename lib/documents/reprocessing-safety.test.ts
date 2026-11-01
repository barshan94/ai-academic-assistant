import { describe, expect, it } from "vitest";
import { canSafelyReplaceExtractedPages } from "./reprocessing-safety";

describe("canSafelyReplaceExtractedPages", () => {
  it("allows replacement when no saved academic content references the pages", () => {
    expect(canSafelyReplaceExtractedPages({
      questionReferences: 0,
      chapterNoteReferences: 0,
    })).toBe(true);
  });

  it("blocks replacement when a question references an extracted page", () => {
    expect(canSafelyReplaceExtractedPages({
      questionReferences: 1,
      chapterNoteReferences: 0,
    })).toBe(false);
  });

  it("blocks replacement when an approved or draft chapter note references a page", () => {
    expect(canSafelyReplaceExtractedPages({
      questionReferences: 0,
      chapterNoteReferences: 1,
    })).toBe(false);
  });

  it("blocks replacement when both kinds of references exist", () => {
    expect(canSafelyReplaceExtractedPages({
      questionReferences: 3,
      chapterNoteReferences: 2,
    })).toBe(false);
  });
});
