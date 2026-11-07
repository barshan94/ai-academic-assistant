import { describe, expect, it, vi } from "vitest";
import { getConfirmedChunkOffset, queryResumableUploadStatus } from "./resumable-upload-client";

describe("queryResumableUploadStatus", () => {
  it("sends the opaque session and exact total size, then returns the confirmed offset", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ complete: false, nextOffset: 1_048_576 }), { status: 200 }),
    );

    await expect(queryResumableUploadStatus("opaque-session", 2_000_000, fetcher)).resolves.toEqual({
      complete: false,
      nextOffset: 1_048_576,
    });
    expect(fetcher).toHaveBeenCalledWith("/api/documents/upload/resumable/chunk", {
      method: "POST",
      headers: {
        "X-Upload-Session": "opaque-session",
        "Content-Range": "bytes */2000000",
      },
    });
  });

  it("accepts a completed upload only at the exact total byte count", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ complete: true, nextOffset: 2_000_000 }), { status: 200 }),
    );
    await expect(queryResumableUploadStatus("opaque-session", 2_000_000, fetcher)).resolves.toEqual({
      complete: true,
      nextOffset: 2_000_000,
    });
  });

  it("rejects malformed JSON, non-object payloads and oversized responses", async () => {
    const malformed = vi.fn<typeof fetch>().mockResolvedValue(new Response("{"));
    await expect(queryResumableUploadStatus("session", 100, malformed)).rejects.toThrow("invalid or too large");

    const primitive = vi.fn<typeof fetch>().mockResolvedValue(new Response("[]"));
    await expect(queryResumableUploadStatus("session", 100, primitive)).rejects.toThrow("response was invalid");

    const oversized = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ error: "x".repeat(17 * 1024) }), {
        headers: { "Content-Length": String(17 * 1024) },
      }),
    );
    await expect(queryResumableUploadStatus("session", 100, oversized)).rejects.toThrow("invalid or too large");
  });

  it("returns bounded server errors and uses a safe fallback for malformed error payloads", async () => {
    const known = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ error: "Google Drive upload session expired." }), { status: 410 }),
    );
    await expect(queryResumableUploadStatus("session", 100, known)).rejects.toThrow("session expired");

    const malformed = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ error: "x".repeat(301) }), { status: 503 }),
    );
    await expect(queryResumableUploadStatus("session", 100, malformed)).rejects.toThrow("Could not check");
  });

  it("rejects invalid session tokens and source sizes before making a request", async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(queryResumableUploadStatus("", 100, fetcher)).rejects.toThrow("session or source file size is invalid");
    await expect(queryResumableUploadStatus("session", 0, fetcher)).rejects.toThrow("session or source file size is invalid");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects offsets outside the source file", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ complete: false, nextOffset: 101 }), { status: 200 }),
    );
    await expect(queryResumableUploadStatus("session", 100, fetcher)).rejects.toThrow("invalid resume position");
  });
});

describe("getConfirmedChunkOffset", () => {
  it("accepts only forward progress within the submitted chunk", () => {
    expect(getConfirmedChunkOffset({
      currentOffset: 0,
      chunkEndExclusive: 1_048_576,
      totalBytes: 2_000_000,
      status: { complete: false, nextOffset: 1_048_576 },
    })).toBe(1_048_576);
  });

  it("rejects zero progress, backward progress and progress beyond the chunk", () => {
    const base = { currentOffset: 100, chunkEndExclusive: 200, totalBytes: 500 };
    for (const nextOffset of [0, 100, 201, 501, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => getConfirmedChunkOffset({
        ...base,
        status: { complete: false, nextOffset },
      })).toThrow("safe forward upload progress");
    }
  });

  it("accepts completion only at the exact total byte count", () => {
    expect(getConfirmedChunkOffset({
      currentOffset: 100,
      chunkEndExclusive: 200,
      totalBytes: 200,
      status: { complete: true, nextOffset: 200 },
    })).toBe(200);
    expect(() => getConfirmedChunkOffset({
      currentOffset: 100,
      chunkEndExclusive: 200,
      totalBytes: 200,
      status: { complete: true, nextOffset: 199 },
    })).toThrow("safe forward upload progress");
  });
});
