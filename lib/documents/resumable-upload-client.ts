import { MAX_UPLOAD_BYTES } from "@/lib/documents/upload-limits";
import { readLimitedResponseText } from "@/lib/http/read-limited-response";

export type ResumableUploadStatus = {
  complete: boolean;
  nextOffset: number;
};

/**
 * Ask the server (and therefore Google Drive) for the authoritative upload
 * position. This is safe to call after a lost response or page reload.
 */
export async function queryResumableUploadStatus(
  sessionToken: string,
  totalBytes: number,
  fetcher: typeof fetch = fetch,
): Promise<ResumableUploadStatus> {
  if (
    typeof sessionToken !== "string" ||
    sessionToken.length === 0 ||
    sessionToken.length > 8192 ||
    !Number.isSafeInteger(totalBytes) ||
    totalBytes < 1 ||
    totalBytes > MAX_UPLOAD_BYTES
  ) {
    throw new Error("The saved upload session or source file size is invalid.");
  }

  const response = await fetcher("/api/documents/upload/resumable/chunk", {
    method: "POST",
    headers: {
      "X-Upload-Session": sessionToken,
      "Content-Range": `bytes */${totalBytes}`,
    },
  });

  let body: unknown;
  try {
    body = JSON.parse(await readLimitedResponseText(response, 16 * 1024));
  } catch {
    throw new Error("The upload status response was invalid or too large.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("The upload status response was invalid.");
  }

  const payload = body as {
    error?: unknown;
    complete?: unknown;
    nextOffset?: unknown;
  };
  if (!response.ok) {
    const message = typeof payload.error === "string" && payload.error.length > 0 && payload.error.length <= 300
      ? payload.error
      : "Could not check the upload position.";
    throw new Error(message);
  }

  const nextOffset = payload.nextOffset;
  if (
    typeof payload.complete !== "boolean" ||
    typeof nextOffset !== "number" ||
    !Number.isSafeInteger(nextOffset) ||
    nextOffset < 0 ||
    nextOffset > totalBytes ||
    (payload.complete && nextOffset !== totalBytes)
  ) {
    throw new Error("Google Drive returned an invalid resume position. The upload was stopped safely.");
  }

  return { complete: payload.complete, nextOffset };
}

/**
 * Validate a chunk acknowledgement before the browser advances its cursor.
 * A 308 with no forward progress must never create an unbounded resend loop.
 */
export function getConfirmedChunkOffset(input: {
  currentOffset: number;
  chunkEndExclusive: number;
  totalBytes: number;
  status: ResumableUploadStatus;
}): number {
  const { currentOffset, chunkEndExclusive, totalBytes, status } = input;
  if (
    !Number.isSafeInteger(currentOffset) ||
    !Number.isSafeInteger(chunkEndExclusive) ||
    !Number.isSafeInteger(totalBytes) ||
    currentOffset < 0 ||
    chunkEndExclusive <= currentOffset ||
    chunkEndExclusive > totalBytes ||
    (status.complete && status.nextOffset !== totalBytes) ||
    (!status.complete && (
      !Number.isSafeInteger(status.nextOffset) ||
      status.nextOffset <= currentOffset ||
      status.nextOffset > chunkEndExclusive
    ))
  ) {
    throw new Error("Google Drive did not confirm safe forward upload progress.");
  }
  return status.complete ? totalBytes : status.nextOffset;
}
