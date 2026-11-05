import { describe, expect, it, vi } from "vitest";
import { queryResumableUploadStatus } from "@/lib/documents/resumable-upload-client";

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

  it("surfaces safe server errors for expired or invalid sessions", async () => {
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
