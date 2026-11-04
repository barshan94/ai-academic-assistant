import { describe, expect, it } from "vitest";
import { parsePageCorrectionInput } from "@/lib/documents/page-correction-input";

const validIds = {
  pageId: "f7b3b46d-3c11-4d0e-9a4f-ef41cfa4a1b0",
  documentId: "f9a7f66d-0d3f-4a50-8c1e-8d0d6b7b1d32",
};

describe("parsePageCorrectionInput", () => {
  it("accepts valid IDs and trims corrected text", () => {
    expect(parsePageCorrectionInput({
      ...validIds,
      extractedText: "  Corrected question text  ",
    })).toMatchObject({
      success: true,
      data: { ...validIds, extractedText: "Corrected question text" },
    });
  });

  it("rejects invalid or missing UUIDs", () => {
    expect(parsePageCorrectionInput({
      ...validIds,
      pageId: "not-a-uuid",
      extractedText: "Corrected text",
    }).success).toBe(false);
    expect(parsePageCorrectionInput({
      documentId: validIds.documentId,
      extractedText: "Corrected text",
    }).success).toBe(false);
  });

  it("rejects empty, whitespace-only, and over-limit text", () => {
    for (const extractedText of ["", "   ", "x".repeat(50_001)]) {
      expect(parsePageCorrectionInput({
        ...validIds,
        extractedText,
      }).success).toBe(false);
    }
  });

  it("rejects non-string FormData values such as files", () => {
    expect(parsePageCorrectionInput({
      ...validIds,
      extractedText: new File(["not text"], "upload.pdf"),
    }).success).toBe(false);
  });
});
