import { DRIVE_UPLOAD_CHUNK_BYTES, DRIVE_UPLOAD_GRANULARITY_BYTES } from "@/lib/documents/upload-limits";

export const DRIVE_UPLOAD_CHUNK_SIZE = DRIVE_UPLOAD_CHUNK_BYTES;
export const DRIVE_UPLOAD_GRANULARITY = DRIVE_UPLOAD_GRANULARITY_BYTES;

export function parseDriveUploadOffset(range: string | null) {
  if (!range) return 0;
  const match = /^bytes=0-(\d+)$/.exec(range);
  if (!match) throw new Error("Google Drive returned an invalid upload range.");
  return Number(match[1]) + 1;
}

export function isValidDriveChunk(input: {
  contentRange: string;
  byteLength: number;
  totalBytes: number;
}) {
  const match = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(input.contentRange);
  if (!match) return false;
  const start = Number(match[1]);
  const end = Number(match[2]);
  const total = Number(match[3]);
  return Number.isSafeInteger(start)
    && Number.isSafeInteger(end)
    && total === input.totalBytes
    && start >= 0
    && end >= start
    && end - start + 1 === input.byteLength
    && input.byteLength > 0
    && input.byteLength <= DRIVE_UPLOAD_CHUNK_SIZE
    && start % DRIVE_UPLOAD_GRANULARITY === 0
    && (end + 1 === total || input.byteLength % DRIVE_UPLOAD_GRANULARITY === 0);
}
