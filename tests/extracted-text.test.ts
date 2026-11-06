import { describe, expect, it } from "vitest";
import { splitExtractedText } from "@/lib/documents/split-extracted-text";

describe("split extracted text", () => {
  it("keeps ordinary PDF text as one review page", () => {
    expect(splitExtractedText("Question 1\nExplain photosynthesis.")).toEqual([
      "Question 1\nExplain photosynthesis.",
    ]);
  });

  it("splits form-feed page boundaries and removes empty pages", () => {
    expect(splitExtractedText("Page one\f\fPage two\f")).toEqual(["Page one", "Page two"]);
  });

  it("returns no pages for empty OCR output", () => {
    expect(splitExtractedText(" \n \f ")).toEqual([]);
  });
});
