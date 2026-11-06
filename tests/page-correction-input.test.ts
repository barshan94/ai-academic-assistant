import { describe, expect, it } from "vitest";
import { parsePageCorrectionInput } from "@/lib/documents/page-correction-input";

const pageId = "00000000-0000-4000-8000-000000000001";
const documentId = "00000000-0000-4000-8000-000000000002";

describe("page correction form input", () => {
  it("accepts valid string fields and trims the corrected text", () => {
    const result = parsePageCorrectionInput({
      pageId,
      documentId,
      extractedText: "  corrected OCR text  ",
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.extractedText).toBe("corrected OCR text");
  });

  it("rejects a File supplied where corrected text is expected", () => {
    const result = parsePageCorrectionInput({
      pageId,
      documentId,
      extractedText: new File(["not correction text"], "payload.txt", { type: "text/plain" }),
    });

    expect(result.success).toBe(false);
  });

  it("rejects missing, blank and oversized corrected text", () => {
    expect(parsePageCorrectionInput({ pageId, documentId, extractedText: null }).success).toBe(false);
    expect(parsePageCorrectionInput({ pageId, documentId, extractedText: "   " }).success).toBe(false);
    expect(parsePageCorrectionInput({ pageId, documentId, extractedText: "x".repeat(50_001) }).success).toBe(false);
  });

  it("rejects malformed identifiers and non-string identifier values", () => {
    expect(parsePageCorrectionInput({ pageId: "not-a-uuid", documentId, extractedText: "text" }).success).toBe(false);
    expect(parsePageCorrectionInput({ pageId: new File(["x"], "id.txt"), documentId, extractedText: "text" }).success).toBe(false);
  });
});
