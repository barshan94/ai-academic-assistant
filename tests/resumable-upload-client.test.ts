import { describe, expect, it, vi } from "vitest";
import { getConfirmedChunkOffset, queryResumableUploadStatus } from "@/lib/documents/resumable-upload-client";

describe("resumable upload chunk acknowledgement", () => {
  it("advances only to a Drive-confirmed offset within the chunk just sent", () => {
    expect(getConfirmedChunkOffset({
      currentOffset: 0,
      chunkEndExclusive: 1_048_576,
      totalBytes: 2_097_152,
      status: { complete: false, nextOffset: 1_048_576 },
    })).toBe(1_048_576);
  });

  it("stops when Drive confirms no forward progress", () => {
    expect(() => getConfirmedChunkOffset({
      currentOffset: 0,
      chunkEndExclusive: 1_048_576,
      totalBytes: 2_097_152,
      status: { complete: false, nextOffset: 0 },
    })).toThrow("did not confirm safe forward upload progress");
  });

  it("stops when Drive reports an offset beyond the chunk that was sent", () => {
    expect(() => getConfirmedChunkOffset({
      currentOffset: 0,
      chunkEndExclusive: 1_048_576,
      totalBytes: 2_097_152,
      status: { complete: false, nextOffset: 1_048_577 },
    })).toThrow("did not confirm safe forward upload progress");
  });

  it("accepts completion only when the entire source length is confirmed", () => {
    expect(getConfirmedChunkOffset({
      currentOffset: 1_048_576,
      chunkEndExclusive: 2_097_152,
      totalBytes: 2_097_152,
      status: { complete: true, nextOffset: 2_097_152 },
    })).toBe(2_097_152);
  });
});

describe("resumable upload status query", () => {
  it("asks the server for Drive's confirmed offset without sending a body", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(JSON.stringify({ complete: false, nextOffset: 1_048_576 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(queryResumableUploadStatus("opaque-session-token", 2_097_152, fetchMock))
      .resolves.toEqual({ complete: false, nextOffset: 1_048_576 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/documents/upload/resumable/chunk");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("X-Upload-Session")).toBe("opaque-session-token");
    expect(new Headers(init.headers).get("Content-Range")).toBe("bytes */2097152");
    expect(init.body).toBeUndefined();
  });

  it("recognizes a session whose final chunk was accepted before the browser lost its response", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(JSON.stringify({ complete: true, nextOffset: 1234 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(queryResumableUploadStatus("opaque-session-token", 1234, fetchMock))
      .resolves.toEqual({ complete: true, nextOffset: 1234 });
  });

  it("rejects an offset outside the source file instead of resuming unsafely", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(JSON.stringify({ complete: false, nextOffset: 1235 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(queryResumableUploadStatus("opaque-session-token", 1234, fetchMock))
      .rejects.toThrow("invalid resume position");
  });

  it("rejects a successful but incomplete status response with no confirmed offset", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(JSON.stringify({ complete: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(queryResumableUploadStatus("opaque-session-token", 1234, fetchMock))
      .rejects.toThrow("invalid resume position");
  });

  it("rejects a completed response unless the entire source length is confirmed", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(JSON.stringify({ complete: true, nextOffset: 1233 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(queryResumableUploadStatus("opaque-session-token", 1234, fetchMock))
      .rejects.toThrow("invalid resume position");
  });

  it("rejects invalid file sizes and empty session tokens before making a request", async () => {
    const fetchMock = vi.fn<typeof fetch>();

    await expect(queryResumableUploadStatus("", 1234, fetchMock))
      .rejects.toThrow("session or source file size is invalid");
    await expect(queryResumableUploadStatus("opaque-session-token", 0, fetchMock))
      .rejects.toThrow("session or source file size is invalid");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON, non-object payloads and oversized status responses", async () => {
    const malformed = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response("{"));
    await expect(queryResumableUploadStatus("opaque-session-token", 1234, malformed))
      .rejects.toThrow("invalid or too large");

    const nonObject = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response("[]"));
    await expect(queryResumableUploadStatus("opaque-session-token", 1234, nonObject))
      .rejects.toThrow("response was invalid");

    const oversized = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "x".repeat(17 * 1024) }), {
        headers: { "Content-Length": String(17 * 1024) },
      }),
    );
    await expect(queryResumableUploadStatus("opaque-session-token", 1234, oversized))
      .rejects.toThrow("invalid or too large");
  });

  it("limits error messages from non-success responses", async () => {
    const malformedError = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "x".repeat(301) }), { status: 503 }),
    );
    await expect(queryResumableUploadStatus("opaque-session-token", 1234, malformedError))
      .rejects.toThrow("Could not check the upload position.");
  });

  it("surfaces safe server errors for expired or invalid sessions", async () =>
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Google Drive upload session expired. Start again." }), {
        status: 410,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(queryResumableUploadStatus("opaque-session-token", 1234, fetchMock))
      .rejects.toThrow("Google Drive upload session expired");
  });
});
