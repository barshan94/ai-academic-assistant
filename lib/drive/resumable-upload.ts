import { DRIVE_UPLOAD_CHUNK_BYTES, DRIVE_UPLOAD_GRANULARITY_BYTES } from "@/lib/documents/upload-limits";

export const DRIVE_UPLOAD_CHUNK_SIZE = DRIVE_UPLOAD_CHUNK_BYTES;
export const DRIVE_UPLOAD_GRANULARITY = DRIVE_UPLOAD_GRANULARITY_BYTES;

export function parseDriveUploadOffset(range: string | null, totalBytes?: number) {
  if (!range) return 0;
  const match = /^bytes=0-(\d+)$/.exec(range);
  if (!match) throw new Error("Google Drive returned an invalid upload range.");
  const offset = Number(match[1]) + 1;
  if (!Number.isSafeInteger(offset) || (totalBytes !== undefined && offset > totalBytes)) {
    throw new Error("Google Drive returned an out-of-bounds upload range.");
  }
  return offset;
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
    && Number.isSafeInteger(total)
    && total > 0
    && Number.isSafeInteger(input.totalBytes)
    && input.totalBytes > 0
    && Number.isSafeInteger(input.byteLength)
    && total === input.totalBytes
    && start >= 0
    && end >= start
    && end < total
    && end - start + 1 === input.byteLength
    && input.byteLength > 0
    && input.byteLength <= DRIVE_UPLOAD_CHUNK_SIZE
    && start % DRIVE_UPLOAD_GRANULARITY === 0
    && (end + 1 === total || input.byteLength % DRIVE_UPLOAD_GRANULARITY === 0);
}

export async function readDriveUploadChunk(body: ReadableStream<Uint8Array> | null) {
  if (!body) return new Uint8Array();
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      total += result.value.byteLength;
      if (total > DRIVE_UPLOAD_CHUNK_SIZE) {
        await reader.cancel();
        throw new Error("Upload chunk exceeds the 1 MB server limit.");
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}
