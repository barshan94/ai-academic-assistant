import { MAX_UPLOAD_BYTES } from "@/lib/documents/upload-limits";

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
  const body = await response.json() as {
    error?: string;
    complete?: boolean;
    nextOffset?: number;
  };

  if (!response.ok) {
    throw new Error(body.error || "Could not check the upload position.");
  }

  const nextOffset = body.nextOffset;
  if (
    typeof body.complete !== "boolean" ||
    typeof nextOffset !== "number" ||
    !Number.isSafeInteger(nextOffset) ||
    nextOffset < 0 ||
    nextOffset > totalBytes ||
    (body.complete && nextOffset !== totalBytes)
  ) {
    throw new Error("Google Drive returned an invalid resume position. The upload was stopped safely.");
  }

  return { complete: body.complete, nextOffset };
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
