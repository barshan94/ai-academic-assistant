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

  const nextOffset = typeof body.nextOffset === "number" ? body.nextOffset : 0;
  if (!Number.isSafeInteger(nextOffset) || nextOffset < 0 || nextOffset > totalBytes) {
    throw new Error("Google Drive returned an invalid resume position. The upload was stopped safely.");
  }

  return {
    complete: body.complete === true,
    nextOffset,
  };
}
