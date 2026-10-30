import { PDFDocument } from "pdf-lib";

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export function safeFileName(value: string) {
  return value
    .replaceAll("/", "_")
    .replaceAll("\\", "_")
    .replace(/[\x00-\x1f]/g, "_")
    .trim()
    .slice(0, 180) || "academic-document";
}

export async function normalizeToPdf(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error("Choose a file smaller than 4 MB.");
  }

  if (file.type === "application/pdf" && Buffer.from(bytes).subarray(0, 5).toString() === "%PDF-") {
    const name = file.name.toLowerCase().endsWith(".pdf") ? file.name : file.name + ".pdf";
    return { bytes, fileName: safeFileName(name), converted: false };
  }

  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = Buffer.from(bytes).subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (!isJpeg && !isPng) throw new Error("Only valid PDF, JPEG and PNG files are supported.");

  const pdf = await PDFDocument.create();
  const image = isJpeg ? await pdf.embedJpg(bytes) : await pdf.embedPng(bytes);
  const page = pdf.addPage([image.width, image.height]);
  page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  const output = await pdf.save();
  const baseName = file.name.replace(/\.[^.]+$/, "");
  return {
    bytes: new Uint8Array(output),
    fileName: safeFileName(baseName + ".pdf"),
    converted: true,
  };
}
