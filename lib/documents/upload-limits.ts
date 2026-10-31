export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
export const MAX_IMAGE_COUNT = 50;
export const DRIVE_UPLOAD_CHUNK_BYTES = 1024 * 1024;
export const DRIVE_UPLOAD_GRANULARITY_BYTES = 256 * 1024;

export function safeFileName(value: string) {
  return value
    .replaceAll("/", "_")
    .replaceAll("\\", "_")
    .replace(/[\x00-\x1f]/g, "_")
    .trim()
    .slice(0, 180) || "academic-document";
}
