import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  createSupabaseServerClientMock,
  createSupabaseServiceRoleClientMock,
  getDriveAccessTokenMock,
  initiateResumablePdfUploadMock,
  sendResumablePdfChunkMock,
  decryptDriveUploadSessionMock,
  deleteDriveFileMock,
  downloadOriginalPdfFromDriveMock,
} = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
  createSupabaseServiceRoleClientMock: vi.fn(),
  getDriveAccessTokenMock: vi.fn(),
  initiateResumablePdfUploadMock: vi.fn(),
  sendResumablePdfChunkMock: vi.fn(),
  decryptDriveUploadSessionMock: vi.fn(),
  deleteDriveFileMock: vi.fn(),
  downloadOriginalPdfFromDriveMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));
vi.mock("@/lib/supabase/service-role", () => ({
  createSupabaseServiceRoleClient: createSupabaseServiceRoleClientMock,
}));
vi.mock("@/lib/drive/crypto", () => ({
  decryptDriveUploadSession: decryptDriveUploadSessionMock,
  encryptDriveUploadSession: vi.fn(),
}));
vi.mock("@/lib/drive/google", () => ({
  getDriveAccessToken: getDriveAccessTokenMock,
  initiateResumablePdfUpload: initiateResumablePdfUploadMock,
  sendResumablePdfChunk: sendResumablePdfChunkMock,
  deleteDriveFile: deleteDriveFileMock,
  downloadOriginalPdfFromDrive: downloadOriginalPdfFromDriveMock,
  isGoogleDriveUploadSessionUri: (value: string) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && url.hostname === "www.googleapis.com"
        && url.pathname === "/upload/drive/v3/files" && !url.username && !url.password;
    } catch {
      return false;
    }
  },
}));
vi.mock("@/lib/observability/safe-log", () => ({
  logSafeOperationalEvent: vi.fn(),
}));

import { POST as startUpload } from "@/app/api/documents/upload/resumable/start/route";
import { POST as uploadChunk } from "@/app/api/documents/upload/resumable/chunk/route";

const validSession = {
  ownerId: "owner-A",
  sessionUri: "https://www.googleapis.com/upload/drive/v3/files?upload_id=opaque",
  fileName: "Physics.pdf",
  fileSizeBytes: 1234,
  sha256: "a".repeat(64),
  pageCount: null,
  expiresAt: Date.now() + 60_000,
};

function makeRequest(path: string, options: {
  origin?: string;
  headers?: Record<string, string>;
  body?: BodyInit;
} = {}) {
  const headers = new Headers(options.headers);
  if (options.origin !== undefined) headers.set("origin", options.origin);
  else headers.set("origin", "https://academic.example");
  return new NextRequest(new URL(path, "https://academic.example"), {
    method: "POST",
    headers,
    body: options.body,
  });
}

beforeEach(() => {
  createSupabaseServerClientMock.mockReset();
  createSupabaseServiceRoleClientMock.mockReset();
  getDriveAccessTokenMock.mockReset();
  initiateResumablePdfUploadMock.mockReset();
  sendResumablePdfChunkMock.mockReset();
  decryptDriveUploadSessionMock.mockReset();
  deleteDriveFileMock.mockReset();
  downloadOriginalPdfFromDriveMock.mockReset();
  downloadOriginalPdfFromDriveMock.mockResolvedValue(Buffer.alloc(1234));
  createSupabaseServerClientMock.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "owner-A" } },
        error: null,
      }),
    },
  });
  decryptDriveUploadSessionMock.mockReturnValue(JSON.stringify(validSession));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("resumable upload route security boundaries", () => {
  it("rejects a cross-origin upload start before creating an authenticated client", async () => {
    const response = await startUpload(makeRequest(
      "/api/documents/upload/resumable/start",
      { origin: "https://attacker.example", body: "{}" },
    ));

    expect(response.status).toBe(403);
    expect(createSupabaseServerClientMock).not.toHaveBeenCalled();
    expect(getDriveAccessTokenMock).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated upload start before contacting Google Drive", async () => {
    createSupabaseServerClientMock.mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "not signed in" },
        }),
      },
    });

    const response = await startUpload(makeRequest(
      "/api/documents/upload/resumable/start",
      { body: JSON.stringify({ fileName: "Physics.pdf", fileSizeBytes: 1234, sha256: "a".repeat(64) }) },
    ));

    expect(response.status).toBe(401);
    expect(getDriveAccessTokenMock).not.toHaveBeenCalled();
    expect(initiateResumablePdfUploadMock).not.toHaveBeenCalled();
  });

  it("rejects a cross-origin chunk before authenticating or decrypting the session", async () => {
    const response = await uploadChunk(makeRequest(
      "/api/documents/upload/resumable/chunk",
      { origin: "https://attacker.example" },
    ));

    expect(response.status).toBe(403);
    expect(createSupabaseServerClientMock).not.toHaveBeenCalled();
    expect(decryptDriveUploadSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a chunk session belonging to a different signed-in account", async () => {
    createSupabaseServerClientMock.mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "owner-B" } },
          error: null,
        }),
      },
    });

    const response = await uploadChunk(makeRequest(
      "/api/documents/upload/resumable/chunk",
      { headers: { "x-upload-session": "opaque-encrypted-session" } },
    ));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "This upload belongs to another account." });
    expect(getDriveAccessTokenMock).not.toHaveBeenCalled();
    expect(sendResumablePdfChunkMock).not.toHaveBeenCalled();
    expect(createSupabaseServiceRoleClientMock).not.toHaveBeenCalled();
  });

  it("reconciles a completed Drive upload after a lost final response using a status query", async () => {
    getDriveAccessTokenMock.mockResolvedValue("drive-access-token");
    sendResumablePdfChunkMock.mockResolvedValue({
      status: 201,
      range: null,
      file: { id: "drive-file-recovered", mimeType: "application/pdf", size: "1234" },
    });
    const registerRpcMock = vi.fn().mockResolvedValue({
      data: [{ document_id: "document-recovered", duplicate: false, stored_drive_file_id: "drive-file-recovered" }],
      error: null,
    });
    createSupabaseServiceRoleClientMock.mockReturnValue({ rpc: registerRpcMock });

    const response = await uploadChunk(makeRequest(
      "/api/documents/upload/resumable/chunk",
      {
        headers: { "x-upload-session": "opaque-encrypted-session", "content-range": "bytes */1234" },
        body: "",
      },
    ));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      nextOffset: 1234, complete: true, documentId: "document-recovered", duplicate: false,
    });
    expect(downloadOriginalPdfFromDriveMock).toHaveBeenCalledWith({
      accessToken: "drive-access-token", driveFileId: "drive-file-recovered",
      expectedSizeBytes: 1234, expectedSha256: "a".repeat(64),
    });
    expect(registerRpcMock).toHaveBeenCalledOnce();
  });

  it("queries Drive for the authoritative offset without sending a chunk body", async () => {
    getDriveAccessTokenMock.mockResolvedValue("drive-access-token");
    sendResumablePdfChunkMock.mockResolvedValue({
      status: 308,
      range: "bytes=0-999",
      file: null,
    });

    const response = await uploadChunk(makeRequest(
      "/api/documents/upload/resumable/chunk",
      {
        headers: {
          "x-upload-session": "opaque-encrypted-session",
          "content-range": "bytes */1234",
        },
      },
    ));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ nextOffset: 1000, complete: false });
    expect(sendResumablePdfChunkMock).toHaveBeenCalledWith({
      accessToken: "drive-access-token",
      sessionUri: validSession.sessionUri,
      contentRange: "bytes */1234",
      bytes: new Uint8Array(),
    });
    expect(createSupabaseServiceRoleClientMock).not.toHaveBeenCalled();
  });

  it("accepts a signed upload session with the supported 100-page maximum", async () => {
    decryptDriveUploadSessionMock.mockReturnValueOnce(JSON.stringify({
      ...validSession,
      pageCount: 100,
    }));
    getDriveAccessTokenMock.mockResolvedValue("drive-access-token");
    sendResumablePdfChunkMock.mockResolvedValue({
      status: 308,
      range: null,
      file: null,
    });

    const response = await uploadChunk(makeRequest(
      "/api/documents/upload/resumable/chunk",
      {
        headers: {
          "x-upload-session": "opaque-encrypted-session",
          "content-range": "bytes */1234",
        },
      },
    ));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ nextOffset: 0, complete: false });
  });

  it("rejects a signed upload session above the 100-page maximum", async () => {
    decryptDriveUploadSessionMock.mockReturnValueOnce(JSON.stringify({
      ...validSession,
      pageCount: 101,
    }));

    const response = await uploadChunk(makeRequest(
      "/api/documents/upload/resumable/chunk",
      {
        headers: {
          "x-upload-session": "opaque-encrypted-session",
          "content-range": "bytes */1234",
        },
      },
    ));

    expect(response.status).toBe(400);
    expect(getDriveAccessTokenMock).not.toHaveBeenCalled();
    expect(sendResumablePdfChunkMock).not.toHaveBeenCalled();
  });

  it("rejects malformed chunk ranges before contacting Google Drive", async () => {
    const response = await uploadChunk(makeRequest(
      "/api/documents/upload/resumable/chunk",
      {
        headers: {
          "x-upload-session": "opaque-encrypted-session",
          "content-range": "bytes 10-20/1234",
        },
        body: "invalid-range-body",
      },
    ));

    expect(response.status).toBe(400);
    expect(getDriveAccessTokenMock).not.toHaveBeenCalled();
    expect(sendResumablePdfChunkMock).not.toHaveBeenCalled();
  });

  it("rejects a decrypted session URI outside the exact Google Drive upload endpoint", async () => {
    decryptDriveUploadSessionMock.mockReturnValueOnce(JSON.stringify({
      ...validSession,
      sessionUri: "https://attacker.example/upload/drive/v3/files?upload_id=opaque",
    }));

    const response = await uploadChunk(makeRequest(
      "/api/documents/upload/resumable/chunk",
      { headers: { "x-upload-session": "opaque-encrypted-session", "content-range": "bytes */1234" } },
    ));

    expect(response.status).toBe(400);
    expect(getDriveAccessTokenMock).not.toHaveBeenCalled();
    expect(sendResumablePdfChunkMock).not.toHaveBeenCalled();
    expect(createSupabaseServiceRoleClientMock).not.toHaveBeenCalled();
  });

  it("rejects an expired decrypted session before contacting Google Drive", async () => {
    decryptDriveUploadSessionMock.mockReturnValueOnce(JSON.stringify({
      ...validSession,
      expiresAt: Date.now() - 1,
    }));

    const response = await uploadChunk(makeRequest(
      "/api/documents/upload/resumable/chunk",
      { headers: { "x-upload-session": "opaque-encrypted-session", "content-range": "bytes */1234" } },
    ));

    expect(response.status).toBe(400);
    expect(getDriveAccessTokenMock).not.toHaveBeenCalled();
    expect(sendResumablePdfChunkMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid encrypted session before any Drive or service-role operation", async () => {
    decryptDriveUploadSessionMock.mockImplementationOnce(() => {
      throw new Error("ciphertext authentication failed");
    });

    const response = await uploadChunk(makeRequest(
      "/api/documents/upload/resumable/chunk",
      { headers: { "x-upload-session": "tampered-session", "content-range": "bytes */1234" } },
    ));

    expect(response.status).toBe(400);
    expect(getDriveAccessTokenMock).not.toHaveBeenCalled();
    expect(sendResumablePdfChunkMock).not.toHaveBeenCalled();
    expect(createSupabaseServiceRoleClientMock).not.toHaveBeenCalled();
  });

  it("rejects a missing upload-session token before decrypting or contacting Drive", async () => {
    const response = await uploadChunk(makeRequest(
      "/api/documents/upload/resumable/chunk",
      { headers: { "content-range": "bytes */1234" } },
    ));

    expect(response.status).toBe(400);
    expect(decryptDriveUploadSessionMock).not.toHaveBeenCalled();
    expect(getDriveAccessTokenMock).not.toHaveBeenCalled();
  });

  it("rejects a first chunk without the PDF file signature before contacting Drive", async () => {
    decryptDriveUploadSessionMock.mockReturnValueOnce(JSON.stringify({
      ...validSession,
      fileSizeBytes: 4,
    }));

    const response = await uploadChunk(makeRequest(
      "/api/documents/upload/resumable/chunk",
      {
        headers: {
          "x-upload-session": "opaque-encrypted-session",
          "content-range": "bytes 0-3/4",
        },
        body: "NOPE",
      },
    ));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "The uploaded content does not have a valid PDF signature." });
    expect(getDriveAccessTokenMock).not.toHaveBeenCalled();
    expect(sendResumablePdfChunkMock).not.toHaveBeenCalled();
    expect(createSupabaseServiceRoleClientMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid checksum at upload start before quota consumption or Drive session creation", async () => {
    const response = await startUpload(makeRequest(
      "/api/documents/upload/resumable/start",
      {
        body: JSON.stringify({
          fileName: "Physics.pdf",
          fileSizeBytes: 1234,
          sha256: "not-a-sha256",
        }),
      },
    ));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "The file checksum is invalid." });
    expect(getDriveAccessTokenMock).not.toHaveBeenCalled();
    expect(initiateResumablePdfUploadMock).not.toHaveBeenCalled();
    expect(createSupabaseServiceRoleClientMock).not.toHaveBeenCalled();
  });


  it("registers a completed Drive PDF only after Drive confirms its exact type and byte size", async () => {
    getDriveAccessTokenMock.mockResolvedValue("drive-access-token");
    sendResumablePdfChunkMock.mockResolvedValue({
      status: 201,
      range: null,
      file: {
        id: "drive-file-123",
        webViewLink: "https://drive.google.com/file/d/drive-file-123/view",
        mimeType: "application/pdf",
        size: "1234",
      },
    });
    const registerRpcMock = vi.fn().mockResolvedValue({
      data: [{
        document_id: "document-123",
        duplicate: false,
        stored_drive_file_id: "drive-file-123",
      }],
      error: null,
    });
    createSupabaseServiceRoleClientMock.mockReturnValue({ rpc: registerRpcMock });

    const response = await uploadChunk(makeRequest(
      "/api/documents/upload/resumable/chunk",
      {
        headers: {
          "x-upload-session": "opaque-encrypted-session",
          "content-range": "bytes 0-1233/1234",
        },
        body: "%PDF-" + "x".repeat(1229),
      },
    ));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      nextOffset: 1234,
      complete: true,
      documentId: "document-123",
      duplicate: false,
    });
    expect(downloadOriginalPdfFromDriveMock).toHaveBeenCalledWith({
      accessToken: "drive-access-token",
      driveFileId: "drive-file-123",
      expectedSizeBytes: 1234,
      expectedSha256: "a".repeat(64),
    });
    expect(registerRpcMock).toHaveBeenCalledWith("register_uploaded_document", {
      p_owner_id: "owner-A",
      p_file_name: "Physics.pdf",
      p_file_size_bytes: 1234,
      p_sha256: "a".repeat(64),
      p_drive_file_id: "drive-file-123",
      p_drive_web_view_link: "https://drive.google.com/file/d/drive-file-123/view",
      p_page_count: null,
    });
    expect(deleteDriveFileMock).not.toHaveBeenCalled();
  });

  it("does not register a Drive PDF when its archived bytes fail the supplied SHA-256 check", async () => {
    getDriveAccessTokenMock.mockResolvedValue("drive-access-token");
    sendResumablePdfChunkMock.mockResolvedValue({
      status: 201,
      range: null,
      file: { id: "drive-file-wrong-checksum", mimeType: "application/pdf", size: "1234" },
    });
    downloadOriginalPdfFromDriveMock.mockRejectedValue(new Error("Archived PDF checksum does not match."));

    const response = await uploadChunk(makeRequest(
      "/api/documents/upload/resumable/chunk",
      {
        headers: { "x-upload-session": "opaque-encrypted-session", "content-range": "bytes 0-1233/1234" },
        body: "%PDF-" + "x".repeat(1229),
      },
    ));

    expect(response.status).toBe(502);
    expect(createSupabaseServiceRoleClientMock).not.toHaveBeenCalled();
    expect(downloadOriginalPdfFromDriveMock).toHaveBeenCalledWith({
      accessToken: "drive-access-token",
      driveFileId: "drive-file-wrong-checksum",
      expectedSizeBytes: 1234,
      expectedSha256: "a".repeat(64),
    });
    expect(deleteDriveFileMock).not.toHaveBeenCalled();
  });

  it("does not register a completed Drive object whose returned byte size differs from the signed upload session", async () => {
    getDriveAccessTokenMock.mockResolvedValue("drive-access-token");
    sendResumablePdfChunkMock.mockResolvedValue({
      status: 200,
      range: null,
      file: {
        id: "drive-file-wrong-size",
        mimeType: "application/pdf",
        size: "1233",
      },
    });

    const response = await uploadChunk(makeRequest(
      "/api/documents/upload/resumable/chunk",
      {
        headers: {
          "x-upload-session": "opaque-encrypted-session",
          "content-range": "bytes 0-1233/1234",
        },
        body: "%PDF-" + "x".repeat(1229),
      },
    ));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "The upload could not be completed. Resume the same file to check the last confirmed byte.",
    });
    expect(createSupabaseServiceRoleClientMock).not.toHaveBeenCalled();
    expect(deleteDriveFileMock).toHaveBeenCalledWith("drive-access-token", "drive-file-wrong-size");
  });


  it("preserves the Drive object when registration outcome is uncertain", async () => {
    getDriveAccessTokenMock.mockResolvedValue("drive-access-token");
    sendResumablePdfChunkMock.mockResolvedValue({
      status: 201,
      range: null,
      file: {
        id: "drive-file-uncertain",
        mimeType: "application/pdf",
        size: "1234",
      },
    });
    const registerRpcMock = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "connection lost after commit" },
    });
    createSupabaseServiceRoleClientMock.mockReturnValue({ rpc: registerRpcMock });

    const response = await uploadChunk(makeRequest(
      "/api/documents/upload/resumable/chunk",
      {
        headers: {
          "x-upload-session": "opaque-encrypted-session",
          "content-range": "bytes 0-1233/1234",
        },
        body: "%PDF-" + "x".repeat(1229),
      },
    ));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "The upload could not be completed. Resume the same file to check the last confirmed byte.",
    });
    expect(registerRpcMock).toHaveBeenCalledOnce();
    expect(deleteDriveFileMock).not.toHaveBeenCalled();
  });

  it("removes a newly uploaded Drive object when registration identifies an existing duplicate", async () => {
    getDriveAccessTokenMock.mockResolvedValue("drive-access-token");
    sendResumablePdfChunkMock.mockResolvedValue({
      status: 201,
      range: null,
      file: {
        id: "drive-file-duplicate-copy",
        mimeType: "application/pdf",
        size: "1234",
      },
    });
    const registerRpcMock = vi.fn().mockResolvedValue({
      data: [{
        document_id: "existing-document",
        duplicate: true,
        stored_drive_file_id: "drive-file-original",
      }],
      error: null,
    });
    createSupabaseServiceRoleClientMock.mockReturnValue({ rpc: registerRpcMock });

    const response = await uploadChunk(makeRequest(
      "/api/documents/upload/resumable/chunk",
      {
        headers: {
          "x-upload-session": "opaque-encrypted-session",
          "content-range": "bytes 0-1233/1234",
        },
        body: "%PDF-" + "x".repeat(1229),
      },
    ));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      nextOffset: 1234,
      complete: true,
      documentId: "existing-document",
      duplicate: true,
    });
    expect(deleteDriveFileMock).toHaveBeenCalledWith("drive-access-token", "drive-file-duplicate-copy");
  });
  it("returns a retryable response when the incoming chunk stream fails", async () => {
    const logSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const failedBody = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(new Error("private client stream failure"));
      },
    });
    const response = await uploadChunk(makeRequest(
      "/api/documents/upload/resumable/chunk",
      {
        headers: {
          "x-upload-session": "opaque-encrypted-session",
          "content-range": "bytes 0-999/1234",
        },
        body: failedBody,
      },
    ));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Could not read this upload chunk. Resume the upload and retry.",
    });
    expect(getDriveAccessTokenMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledOnce();
    const logged = String(logSpy.mock.calls[0][0]);
    expect(logged).toContain('"event":"upload_chunk_body_read_failed"');
    expect(logged).not.toContain("private client stream failure");
  });

  it("fails closed with a retryable response when the duplicate lookup transport rejects", async () => {
    const maybeSingle = vi.fn().mockRejectedValue(new Error("private database transport detail"));
    const eq = vi.fn();
    eq.mockReturnValue({ eq, maybeSingle });
    const from = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq, maybeSingle }) });
    createSupabaseServerClientMock.mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "owner-A" } }, error: null }) },
      from,
    });

    const response = await startUpload(makeRequest(
      "/api/documents/upload/resumable/start",
      { body: JSON.stringify({ fileName: "Physics.pdf", fileSizeBytes: 1234, sha256: "a".repeat(64) }) },
    ));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Could not check for duplicate documents. Try again shortly." });
    expect(getDriveAccessTokenMock).not.toHaveBeenCalled();
    expect(initiateResumablePdfUploadMock).not.toHaveBeenCalled();
  });

  it("fails closed when upload quota transport rejects instead of bypassing quota protection", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn();
    eq.mockReturnValue({ eq, maybeSingle });
    const from = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq, maybeSingle }) });
    const rpc = vi.fn().mockRejectedValue(new Error("private quota transport detail"));
    createSupabaseServerClientMock.mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "owner-A" } }, error: null }) },
      from,
      rpc,
    });
    getDriveAccessTokenMock.mockResolvedValue("drive-access-token");

    const response = await startUpload(makeRequest(
      "/api/documents/upload/resumable/start",
      { body: JSON.stringify({ fileName: "Physics.pdf", fileSizeBytes: 1234, sha256: "a".repeat(64) }) },
    ));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Upload protection is temporarily unavailable. Try again shortly." });
    expect(rpc).toHaveBeenCalledWith("consume_document_upload_quota");
    expect(initiateResumablePdfUploadMock).not.toHaveBeenCalled();
  });


});
