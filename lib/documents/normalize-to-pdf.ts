import { PDFDocument } from "pdf-lib";
import { MAX_UPLOAD_BYTES, MAX_IMAGE_COUNT, safeFileName } from "./upload-limits";

export { MAX_UPLOAD_BYTES, MAX_IMAGE_COUNT, safeFileName } from "./upload-limits";

function validatePngDimensions(bytes: Uint8Array) {
  if (bytes.byteLength < 24) throw new Error("Invalid PNG image.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);
  if (!width || !height || width > 10000 || height > 10000 || width * height > 25000000) {
    throw new Error("Image dimensions exceed the safe conversion limit.");
  }
}

export async function normalizeFilesToPdf(files: File[]) {
  if (!files.length) throw new Error("Choose a PDF or one or more images.");
  if (files.length > MAX_IMAGE_COUNT) throw new Error("Choose no more than 50 images at a time.");

  const declaredBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (!declaredBytes || declaredBytes > MAX_UPLOAD_BYTES) {
    throw new Error("The combined upload must be 100 MB or smaller.");
  }
  const buffers = await Promise.all(files.map(async (file) => new Uint8Array(await file.arrayBuffer())));
  const totalBytes = buffers.reduce((sum, bytes) => sum + bytes.byteLength, 0);
  if (!totalBytes || totalBytes > MAX_UPLOAD_BYTES) {
    throw new Error("The combined upload must be 100 MB or smaller.");
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
    const image = isJpeg ? await pdf.embedJpg(bytes) : await pdf.embedPng(bytes);
    const page = pdf.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  }

  const output = await pdf.save();
  if (output.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error("Converted PDF exceeds the 100 MB upload limit.");
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
