import { describe, expect, it } from "vitest";
import { MAX_SOURCE_CONTEXT_CHARS, prepareSourcePageContext } from "@/lib/ai/source-context";

describe("optional source page context", () => {
  it("rejects missing or empty extracted text", () => {
    expect(() => prepareSourcePageContext({ pageNumber: 1, extractionMethod: "ocr", extractedText: null })).toThrow("SOURCE_CONTEXT_EMPTY");
    expect(() => prepareSourcePageContext({ pageNumber: 1, extractionMethod: "ocr", extractedText: "  " })).toThrow("SOURCE_CONTEXT_EMPTY");
  });

  it("rejects invalid page numbers and unknown extraction methods", () => {
    expect(() => prepareSourcePageContext({ pageNumber: 0, extractionMethod: "ocr", extractedText: "text" })).toThrow("SOURCE_PAGE_INVALID");
    expect(() => prepareSourcePageContext({ pageNumber: 1, extractionMethod: "unknown", extractedText: "text" })).toThrow("SOURCE_METHOD_INVALID");
  });

  it("trims and bounds the source excerpt to 8,000 characters", () => {
    const result = prepareSourcePageContext({ pageNumber: 2, extractionMethod: "pdf_text", extractedText: " " + "x".repeat(MAX_SOURCE_CONTEXT_CHARS + 100) + " " });
    expect(result.text).toHaveLength(MAX_SOURCE_CONTEXT_CHARS);
    expect(result.pageNumber).toBe(2);
  });
});
