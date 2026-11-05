import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  createSupabaseServerClientMock,
  createSupabaseServiceRoleClientMock,
  getDriveAccessTokenMock,
  initiateResumablePdfUploadMock,
  sendResumablePdfChunkMock,
  decryptDriveUploadSessionMock,
} = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
  createSupabaseServiceRoleClientMock: vi.fn(),
  getDriveAccessTokenMock: vi.fn(),
  initiateResumablePdfUploadMock: vi.fn(),
  sendResumablePdfChunkMock: vi.fn(),
  decryptDriveUploadSessionMock: vi.fn(),
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
  deleteDriveFile: vi.fn(),
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
  body?: string;
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

});
