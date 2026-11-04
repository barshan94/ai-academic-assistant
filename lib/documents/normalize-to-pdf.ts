import { PDFDocument } from "pdf-lib";
import { MAX_UPLOAD_BYTES, MAX_IMAGE_COUNT, safeFileName } from "./upload-limits";

export { MAX_UPLOAD_BYTES, MAX_IMAGE_COUNT, safeFileName } from "./upload-limits";

const MAX_IMAGE_EDGE = 4000;
const MAX_IMAGE_PIXELS = 16_000_000;
const MAX_CONVERSION_STEPS = 6;
const JPEG_QUALITIES = [0.9, 0.82, 0.74, 0.66, 0.58, 0.5];

function validatePngDimensions(bytes: Uint8Array) {
  if (bytes.byteLength < 24) throw new Error("Invalid PNG image.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);
  if (!width || !height || width > 10000 || height > 10000 || width * height > 25000000) {
    throw new Error("Image dimensions exceed the safe conversion limit.");
  }
}

function createCanvas(width: number, height: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(width, height);
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  throw new Error("This browser cannot prepare images for PDF conversion.");
}

async function canvasToJpeg(canvas: OffscreenCanvas | HTMLCanvasElement, quality: number) {
  if ("convertToBlob" in canvas) {
    return new Uint8Array(await canvas.convertToBlob({ type: "image/jpeg", quality }).then((blob) => blob.arrayBuffer()));
  }
  return new Uint8Array(await new Promise<ArrayBuffer>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("The browser could not encode this image."));
        return;
      }
      blob.arrayBuffer().then(resolve, reject);
    }, "image/jpeg", quality);
  }));
}

async function prepareImageForPdf(file: File, bytes: Uint8Array, targetBytes: number) {
  if (typeof createImageBitmap === "undefined") {
    throw new Error("Image conversion requires a browser with image decoding support.");
  }

  // from-image applies EXIF orientation before dimensions and pixels are used.
  const bitmap = await createImageBitmap(new Blob([bytes]), { imageOrientation: "from-image" });
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width > 10000 || bitmap.height > 10000 ||
        bitmap.width * bitmap.height > MAX_IMAGE_PIXELS) {
      throw new Error("Image dimensions exceed the safe conversion limit.");
    }

    const initialScale = Math.min(1, MAX_IMAGE_EDGE / bitmap.width, MAX_IMAGE_EDGE / bitmap.height);
    let scale = initialScale;
    let lastEncoded: Uint8Array | null = null;

    for (let step = 0; step < MAX_CONVERSION_STEPS; step += 1) {
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = createCanvas(width, height);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("The browser could not prepare this image for PDF conversion.");

      // A white background keeps transparent PNG diagrams legible in the PDF.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);

      for (const quality of JPEG_QUALITIES) {
        const encoded = await canvasToJpeg(canvas, quality);
        if (!encoded.byteLength) throw new Error("The browser produced an empty image during conversion.");
        lastEncoded = encoded;
        if (encoded.byteLength <= targetBytes) return { bytes: encoded, width, height };
      }

      scale *= 0.82;
    }

    if (lastEncoded && lastEncoded.byteLength <= targetBytes * 1.25) {
      const width = Math.max(1, Math.round(bitmap.width * scale / 0.82));
      const height = Math.max(1, Math.round(bitmap.height * scale / 0.82));
      return { bytes: lastEncoded, width, height };
    }
    throw new Error(`"${file.name}" is too large to convert safely. Reduce its resolution or split the image batch.`);
  } finally {
    bitmap.close();
  }
}

export async function normalizeFilesToPdf(files: File[]) {
  if (!files.length) throw new Error("Choose a PDF or one or more images.");
  if (files.length > MAX_IMAGE_COUNT) throw new Error("Choose no more than 50 images at a time.");

  const declaredBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (!declaredBytes || declaredBytes > MAX_UPLOAD_BYTES) {
    throw new Error("The combined upload must be 50 MB or smaller.");
  }
  const buffers = await Promise.all(files.map(async (file) => new Uint8Array(await file.arrayBuffer())));
  const totalBytes = buffers.reduce((sum, bytes) => sum + bytes.byteLength, 0);
  if (!totalBytes || totalBytes > MAX_UPLOAD_BYTES) {
    throw new Error("The combined upload must be 50 MB or smaller.");
  }

  if (files.length === 1 && files[0].type === "application/pdf") {
    const bytes = buffers[0];
    if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-") {
      throw new Error("The selected PDF does not have a valid PDF signature.");
    }
    const name = files[0].name.toLowerCase().endsWith(".pdf") ? files[0].name : files[0].name + ".pdf";
    return { bytes, fileName: safeFileName(name), converted: false, pageCount: null as number | null };
  }

  if (files.some((file) => file.type === "application/pdf")) {
    throw new Error("Upload one PDF by itself, or select multiple JPEG/PNG images. Do not mix PDFs and images.");
  }

  const pdf = await PDFDocument.create();
  const perImageTarget = Math.max(128 * 1024, Math.floor((MAX_UPLOAD_BYTES * 0.9) / files.length));

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const bytes = buffers[index];
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
    const isPng = pngSignature.every((value, signatureIndex) => bytes[signatureIndex] === value);

    if (file.type === "image/jpeg" && !isJpeg) throw new Error("A JPEG file has an invalid image signature.");
    if (file.type === "image/png" && !isPng) throw new Error("A PNG file has an invalid image signature.");
    if (!["image/jpeg", "image/png"].includes(file.type) || (!isJpeg && !isPng)) {
      throw new Error("Only valid PDF, JPEG and PNG files are supported.");
    }

    if (isPng) validatePngDimensions(bytes);
    const prepared = await prepareImageForPdf(file, bytes, perImageTarget);
    const image = await pdf.embedJpg(prepared.bytes);
    const page = pdf.addPage([prepared.width, prepared.height]);
    page.drawImage(image, { x: 0, y: 0, width: prepared.width, height: prepared.height });
  }

  const output = await pdf.save();
  if (output.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error("Converted PDF exceeds the 50 MB upload limit. Reduce image quality or split the batch.");
  }

  const firstName = files[0].name.replace(/\.[^.]+$/, "");
  const suffix = files.length > 1 ? "-combined" : "";
  return {
    bytes: new Uint8Array(output),
    fileName: safeFileName(firstName + suffix + ".pdf"),
    converted: true,
    pageCount: files.length,
  };
}

export async function normalizeToPdf(file: File) {
  return normalizeFilesToPdf([file]);
}
