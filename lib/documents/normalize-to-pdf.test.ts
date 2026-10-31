import { describe, expect, it } from "vitest";
import {
  MAX_IMAGE_COUNT,
  MAX_UPLOAD_BYTES,
  normalizeFilesToPdf,
  safeFileName,
} from "./normalize-to-pdf";

const validPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pXcAAAAASUVORK5CYII=",
  "base64",
);

function file(bytes: Uint8Array | Buffer, name: string, type: string) {
  return new File([bytes], name, { type });
}

describe("normalizeFilesToPdf", () => {
  it("rejects an empty selection", async () => {
    await expect(normalizeFilesToPdf([])).rejects.toThrow("Choose a PDF or one or more images");
  });

  it("enforces the image-count limit before processing", async () => {
    const files = Array.from({ length: MAX_IMAGE_COUNT + 1 }, (_, index) =>
      file(Buffer.from([1]), `image-${index}.jpg`, "image/jpeg"),
    );
    await expect(normalizeFilesToPdf(files)).rejects.toThrow("no more than 50 images");
  });

  it("rejects a combined upload above the configured byte limit", async () => {
    const oversized = file(new Uint8Array(MAX_UPLOAD_BYTES + 1), "large.pdf", "application/pdf");
    await expect(normalizeFilesToPdf([oversized])).rejects.toThrow("smaller than 4 MB");
  });

  it("preserves a valid single PDF byte-for-byte", async () => {
    const source = Buffer.from("%PDF-1.7\nfixture");
    const result = await normalizeFilesToPdf([file(source, "../paper.pdf", "application/pdf")]);
    expect(Buffer.from(result.bytes)).toEqual(source);
    expect(result.fileName).toBe(".._paper.pdf");
    expect(result.converted).toBe(false);
    expect(result.pageCount).toBeNull();
  });

  it("rejects a PDF with an invalid signature", async () => {
    await expect(
      normalizeFilesToPdf([file(Buffer.from("not a pdf"), "paper.pdf", "application/pdf")]),
    ).rejects.toThrow("valid PDF signature");
  });

  it("rejects mixing PDFs and images", async () => {
    await expect(
      normalizeFilesToPdf([
        file(Buffer.from("%PDF-1.7"), "paper.pdf", "application/pdf"),
        file(validPng, "page.png", "image/png"),
      ]),
    ).rejects.toThrow("Do not mix PDFs and images");
  });

  it("rejects an image whose bytes do not match its declared MIME type", async () => {
    await expect(
      normalizeFilesToPdf([file(Buffer.from("not an image"), "page.png", "image/png")]),
    ).rejects.toThrow("invalid image signature");
  });

  it("converts a valid PNG image into a one-page PDF", async () => {
    const result = await normalizeFilesToPdf([file(validPng, "scan.png", "image/png")]);
    expect(Buffer.from(result.bytes).subarray(0, 5).toString()).toBe("%PDF-");
    expect(result.fileName).toBe("scan.pdf");
    expect(result.converted).toBe(true);
    expect(result.pageCount).toBe(1);
  });
});

describe("safeFileName", () => {
  it("removes path separators and control characters and bounds the name", () => {
    expect(safeFileName("../folder\\paper\u0000.pdf")).toBe(".._folder_paper_.pdf");
    expect(safeFileName("x".repeat(200))).toHaveLength(180);
  });

  it("provides a safe fallback for an empty name", () => {
    expect(safeFileName("  ")).toBe("academic-document");
  });
});
