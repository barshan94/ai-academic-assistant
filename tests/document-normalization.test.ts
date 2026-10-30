import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { MAX_UPLOAD_BYTES, normalizeFilesToPdf, normalizeToPdf, safeFileName } from "@/lib/documents/normalize-to-pdf";

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
    expect(result.pageCount).toBe(1);
  });

  it("combines multiple images into pages in selection order", async () => {
    const first = new File([onePixelPng], "first.png", { type: "image/png" });
    const second = new File([onePixelPng], "second.png", { type: "image/png" });
    const result = await normalizeFilesToPdf([first, second]);
    const pdf = await PDFDocument.load(result.bytes);

    expect(result.fileName).toBe("first-combined.pdf");
    expect(result.pageCount).toBe(2);
    expect(pdf.getPageCount()).toBe(2);
  });

  it("rejects unsupported file signatures", async () => {
    const file = new File(["not a PDF"], "paper.pdf", { type: "application/pdf" });
    await expect(normalizeToPdf(file)).rejects.toThrow("valid PDF signature");
  });

  it("rejects mixed PDF and image batches", async () => {
    const pdf = new File(["%PDF-1.7"], "paper.pdf", { type: "application/pdf" });
    const image = new File([onePixelPng], "image.png", { type: "image/png" });
    await expect(normalizeFilesToPdf([pdf, image])).rejects.toThrow("Do not mix PDFs and images");
  });

  it("rejects uploads above the aggregate size limit", async () => {
    const file = new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], "large.png", { type: "image/png" });
    await expect(normalizeToPdf(file)).rejects.toThrow("smaller than 4 MB");
  });

  it("sanitizes path separators and control characters from filenames", () => {
    expect(safeFileName("../folder\\paper\n.pdf")).toBe(".._folder_paper_.pdf");
  });
});
