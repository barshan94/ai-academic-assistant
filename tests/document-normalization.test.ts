import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";
import { MAX_UPLOAD_BYTES, normalizeFilesToPdf, normalizeToPdf, safeFileName } from "@/lib/documents/normalize-to-pdf";

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p1sAAAAASUVORK5CYII=",
  "base64",
);
const onePixelJpeg = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9k=",
  "base64",
);

const drawCalls: string[] = [];
let bitmapOptions: ImageBitmapOptions | undefined;

class MockOffscreenCanvas {
  width: number;
  height: number;
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
  getContext() {
    return {
      fillStyle: "",
      fillRect: () => drawCalls.push("white-background"),
      drawImage: () => drawCalls.push("draw-image"),
    };
  }
  async convertToBlob(options?: ImageEncodeOptions) {
    drawCalls.push("quality:" + options?.quality);
    return new Blob([onePixelJpeg], { type: "image/jpeg" });
  }
}

beforeEach(() => {
  drawCalls.length = 0;
  bitmapOptions = undefined;
  vi.stubGlobal("OffscreenCanvas", MockOffscreenCanvas);
  vi.stubGlobal("createImageBitmap", async (_source: Blob, options?: ImageBitmapOptions) => {
    bitmapOptions = options;
    return { width: 1, height: 1, close: vi.fn() };
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("document normalization", () => {
  it("preserves an existing PDF byte-for-byte", async () => {
    const source = Buffer.from("%PDF-1.7\\nminimal test fixture");
    const file = new File([source], "paper.pdf", { type: "application/pdf" });
    const result = await normalizeToPdf(file);

    expect(result.converted).toBe(false);
    expect(result.fileName).toBe("paper.pdf");
    expect(Buffer.from(result.bytes)).toEqual(source);
  });

  it("converts a valid PNG image into a PDF and applies browser image orientation", async () => {
    const file = new File([onePixelPng], "question.png", { type: "image/png" });
    const result = await normalizeToPdf(file);

    expect(result.converted).toBe(true);
    expect(result.fileName).toBe("question.pdf");
    expect(Buffer.from(result.bytes).subarray(0, 5).toString()).toBe("%PDF-");
    expect(result.pageCount).toBe(1);
    expect(bitmapOptions?.imageOrientation).toBe("from-image");
    expect(drawCalls).toContain("white-background");
    expect(drawCalls).toContain("draw-image");
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
    const oversized = { size: MAX_UPLOAD_BYTES + 1 } as unknown as File;
    await expect(normalizeToPdf(oversized)).rejects.toThrow("50 MB or smaller");
  });

  it("rejects PNG dimensions above the safe pixel limit before decoding", async () => {
    const oversizedPng = Uint8Array.from(onePixelPng);
    const view = new DataView(oversizedPng.buffer);
    view.setUint32(16, 6000, false);
    view.setUint32(20, 5000, false);
    const file = new File([oversizedPng], "oversized.png", { type: "image/png" });
    await expect(normalizeToPdf(file)).rejects.toThrow("dimensions exceed the safe conversion limit");
  });

  it("sanitizes path separators and control characters from filenames", () => {
    expect(safeFileName("../folder\\\\paper\\n.pdf")).toBe(".._folder_paper_.pdf");
  });
});
