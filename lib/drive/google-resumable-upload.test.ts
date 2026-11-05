import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { initiateResumablePdfUpload, isGoogleDriveUploadSessionUri, sendResumablePdfChunk } from "@/lib/drive/google";

const sessionUri = "https://www.googleapis.com/upload/drive/v3/files?upload_id=opaque-session";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Google Drive resumable upload transport", () => {
  it("accepts only HTTPS Google Drive upload-session URLs", () => {
    expect(isGoogleDriveUploadSessionUri(sessionUri)).toBe(true);
    expect(isGoogleDriveUploadSessionUri("http://www.googleapis.com/upload/drive/v3/files?upload_id=x")).toBe(false);
    expect(isGoogleDriveUploadSessionUri("https://attacker.example/upload/drive/v3/files?upload_id=x")).toBe(false);
    expect(isGoogleDriveUploadSessionUri("https://www.googleapis.com.evil.example/upload/drive/v3/files?upload_id=x")).toBe(false);
    expect(isGoogleDriveUploadSessionUri("https://user:pass@www.googleapis.com/upload/drive/v3/files?upload_id=x")).toBe(false);
  });

  it("starts an upload only when Google returns a valid session Location", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(null, {
      status: 200,
      headers: { Location: sessionUri },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(initiateResumablePdfUpload({
      accessToken: "access-token",
      fileName: "Physics.pdf",
      fileSizeBytes: 1234,
    })).resolves.toBe(sessionUri);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("uploadType=resumable");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("X-Upload-Content-Length")).toBe("1234");
    expect(new Headers(init.headers).get("X-Upload-Content-Type")).toBe("application/pdf");
    expect(init.redirect).toBe("error");
  });

  it("rejects a successful-looking response with an unsafe session URL", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(null, {
      status: 200,
      headers: { Location: "https://attacker.example/upload/drive/v3/files?upload_id=x" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(initiateResumablePdfUpload({
      accessToken: "access-token",
      fileName: "Physics.pdf",
      fileSizeBytes: 1234,
    })).rejects.toThrow("invalid upload session URL");
  });

  it("sends a status query without a body and returns Drive's confirmed range", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(null, {
      status: 308,
      headers: { Range: "bytes=0-1048575" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendResumablePdfChunk({
      accessToken: "access-token",
      sessionUri,
      contentRange: "bytes */2097152",
      bytes: new Uint8Array(),
    })).resolves.toEqual({ status: 308, range: "bytes=0-1048575", file: null });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(sessionUri);
    expect(init.method).toBe("PUT");
    expect(new Headers(init.headers).get("Content-Range")).toBe("bytes */2097152");
    expect(new Headers(init.headers).has("Content-Length")).toBe(false);
    expect(init.body).toBeUndefined();
    expect(init.redirect).toBe("manual");
  });

  it("preserves the final Drive file metadata after a completed upload", async () => {
    const metadata = {
      id: "drive-file-123",
      name: "Physics.pdf",
      mimeType: "application/pdf",
      size: "1234",
      webViewLink: "https://drive.google.com/file/d/drive-file-123/view",
    };
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(JSON.stringify(metadata), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendResumablePdfChunk({
      accessToken: "access-token",
      sessionUri,
      contentRange: "bytes 0-1233/1234",
      bytes: new Uint8Array(1234),
    })).resolves.toEqual({ status: 201, range: null, file: metadata });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).get("Content-Range")).toBe("bytes 0-1233/1234");
    expect(new Headers(init.headers).get("Content-Length")).toBe("1234");
    expect(init.redirect).toBe("manual");
  });

  it("refuses an untrusted session URL before making a network request", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    await expect(sendResumablePdfChunk({
      accessToken: "access-token",
      sessionUri: "https://attacker.example/upload/drive/v3/files?upload_id=x",
      contentRange: "bytes */1234",
      bytes: new Uint8Array(),
    })).rejects.toThrow("Invalid Google Drive upload session");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
