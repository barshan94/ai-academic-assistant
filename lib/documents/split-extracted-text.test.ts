import { describe, expect, it } from "vitest";
import { splitExtractedText } from "./split-extracted-text";

describe("splitExtractedText", () => {
  it("returns no pages for empty or whitespace-only OCR output", () => {
    expect(splitExtractedText("")).toEqual([]);
    expect(splitExtractedText(" \n\t ")).toEqual([]);
  });

  it("normalizes Windows and legacy Mac line endings", () => {
    expect(splitExtractedText("first\r\nline\rsecond")).toEqual(["first\nline\nsecond"]);
  });

  it("splits on one or more form-feed page separators", () => {
    expect(splitExtractedText(" page one \f\f page two \f page three ")).toEqual([
      "page one",
      "page two",
      "page three",
    ]);
  });

  it("discards empty page segments without changing remaining page order", () => {
    expect(splitExtractedText("\ffirst\f\fsecond\f")).toEqual(["first", "second"]);
  });

  it("keeps a single page intact when no form-feed separator exists", () => {
    expect(splitExtractedText("question one\nquestion two")).toEqual([
      "question one\nquestion two",
    ]);
  });
});
