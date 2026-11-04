import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  createSupabaseServerClientMock,
  getDriveAccessTokenMock,
  downloadOriginalPdfFromDriveMock,
} = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
  getDriveAccessTokenMock: vi.fn(),
  downloadOriginalPdfFromDriveMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));
vi.mock("@/lib/drive/google", () => ({
  getDriveAccessToken: getDriveAccessTokenMock,
  downloadOriginalPdfFromDrive: downloadOriginalPdfFromDriveMock,
}));

import { GET } from "@/app/api/documents/[id]/original/route";

const documentId = "7b9b6ed2-66e7-4d19-8e73-42ad2e15e1c1";
const ownerId = "owner-user-id";
const pdf = new TextEncoder().encode("%PDF-1.7\nverified original\n%%EOF");

function request() {
  return new NextRequest("https://academic.example/api/documents/" + documentId + "/original");
}

function configureUser(options: {
  userId?: string | null;
  document?: Record<string, unknown> | null;
  documentError?: { message: string } | null;
} = {}) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: options.document === undefined ? {
      drive_file_id: "drive-file-id",
      file_name: "Physics Notes.pdf",
      file_size_bytes: pdf.byteLength,
      mime_type: "application/pdf",
      sha256: "a".repeat(64),
    } : options.document,
    error: options.documentError ?? null,
  });
  const eqOwner = vi.fn(() => ({ maybeSingle }));
  const eqId = vi.fn(() => ({ eq: eqOwner }));
  const select = vi.fn(() => ({ eq: eqId }));
  createSupabaseServerClientMock.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: options.userId === null ? null : { id: options.userId ?? ownerId } },
        error: null,
      }),
    },
    from: vi.fn(() => ({ select })),
  });
  return { maybeSingle, eqId, eqOwner };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("owner-authorized original PDF route", () => {
  it("requires authentication before querying a document", async () => {
    configureUser({ userId: null });
    const response = await GET(request(), { params: Promise.resolve({ id: documentId }) });
    expect(response.status).toBe(401);
    expect(createSupabaseServerClientMock).toHaveBeenCalledOnce();
    expect(getDriveAccessTokenMock).not.toHaveBeenCalled();
  });

  it("returns 404 for a document not owned by the signed-in account", async () => {
    configureUser({ document: null });
    const response = await GET(request(), { params: Promise.resolve({ id: documentId }) });
    expect(response.status).toBe(404);
    expect(getDriveAccessTokenMock).not.toHaveBeenCalled();
    expect(downloadOriginalPdfFromDriveMock).not.toHaveBeenCalled();
  });

  it("returns a private, no-store PDF only after Drive retrieval and integrity verification", async () => {
    configureUser();
    getDriveAccessTokenMock.mockResolvedValue("fresh-access-token");
    downloadOriginalPdfFromDriveMock.mockResolvedValue(Buffer.from(pdf));

    const response = await GET(request(), { params: Promise.resolve({ id: documentId }) });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-disposition")).toContain("Physics%20Notes.pdf");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(pdf);
    expect(downloadOriginalPdfFromDriveMock).toHaveBeenCalledWith({
      accessToken: "fresh-access-token",
      driveFileId: "drive-file-id",
      expectedSizeBytes: pdf.byteLength,
      expectedSha256: "a".repeat(64),
    });
  });

  it("does not attempt unverified retrieval when the document has no stored checksum", async () => {
    configureUser({ document: {
      drive_file_id: "drive-file-id",
      file_name: "Physics Notes.pdf",
      file_size_bytes: pdf.byteLength,
      mime_type: "application/pdf",
      sha256: null,
    } });
    const response = await GET(request(), { params: Promise.resolve({ id: documentId }) });
    expect(response.status).toBe(409);
    expect(downloadOriginalPdfFromDriveMock).not.toHaveBeenCalled();
  });

  it("returns a generic error when Drive retrieval or checksum verification fails", async () => {
    configureUser();
    getDriveAccessTokenMock.mockResolvedValue("fresh-access-token");
    downloadOriginalPdfFromDriveMock.mockRejectedValue(new Error("private Google response detail"));
    const response = await GET(request(), { params: Promise.resolve({ id: documentId }) });
    expect(response.status).toBe(502);
    const body = await response.text();
    expect(body).not.toContain("private Google response detail");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects malformed document IDs without database access", async () => {
    configureUser();
    const response = await GET(request(), { params: Promise.resolve({ id: "not-a-uuid" }) });
    expect(response.status).toBe(404);
    expect(createSupabaseServerClientMock).not.toHaveBeenCalled();
  });
});
