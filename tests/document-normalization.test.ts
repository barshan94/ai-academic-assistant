import { describe, expect, it } from "vitest";
import { normalizeToPdf } from "@/lib/documents/normalize-to-pdf";

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p1sAAAAASUVORK5CYII=",
  "base64",
);

describe("document normalization", () => {
  it("preserves an existing PDF byte-for-byte", async () => {
    const source = Buffer.from("%PDF-1.7\nminimal test fixture");
    const file = new File([source], "paper.pdf", { type: "application/pdf" });
    const result = await normalizeToPdf(file);

    expect(result.converted).toBe(false);
    expect(result.fileName).toBe("paper.pdf");
    expect(Buffer.from(result.bytes)).toEqual(source);
  });

  it("converts a valid PNG image into a PDF", async () => {
    const file = new File([onePixelPng], "question.png", { type: "image/png" });
    const result = await normalizeToPdf(file);

    expect(result.converted).toBe(true);
    expect(result.fileName).toBe("question.pdf");
    expect(Buffer.from(result.bytes).subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("rejects unsupported file signatures", async () => {
    const file = new File(["not a PDF"], "paper.pdf", { type: "application/pdf" });
    await expect(normalizeToPdf(file)).rejects.toThrow("Only valid PDF, JPEG and PNG");
  });
});
