import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { createSupabaseServerClientMock, getDriveAccessTokenMock, extractTextFromDrivePdfMock } = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
  getDriveAccessTokenMock: vi.fn(),
  extractTextFromDrivePdfMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

vi.mock("@/lib/drive/google", () => ({
  getDriveAccessToken: getDriveAccessTokenMock,
  extractTextFromDrivePdf: extractTextFromDrivePdfMock,
}));

import { POST } from "@/app/api/documents/[id]/process/route";

function query(result: { data: unknown; error: unknown }) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    in: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    then: (resolve: (value: typeof result) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

function makeSupabase(claim: () => Promise<{ data: unknown; error: unknown }>) {
  const documentQuery = query({
    data: {
      id: "document-1",
      drive_file_id: "drive-file-1",
      status: "uploaded",
      file_size_bytes: 32,
      sha256: "a".repeat(64),
    },
    error: null,
  });
  const jobQuery = query({
    data: {
      id: "job-1",
      status: "queued",
      attempt_count: 0,
      max_attempts: 3,
      started_at: null,
    },
    error: null,
  });
  const pagesQuery = query({ data: [], error: null });
  const from = vi.fn((table: string) => {
    if (table === "documents") return documentQuery;
    if (table === "processing_jobs") return jobQuery;
    if (table === "document_pages") return pagesQuery;
    throw new Error("Unexpected table: " + table);
  });
  return {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: "owner-1" } }, error: null })) },
    from,
    rpc: vi.fn((name: string) => {
      if (name === "claim_document_processing_job") return claim();
      throw new Error("Unexpected RPC: " + name);
    }),
  };
}

function request() {
  return new NextRequest("https://academic.example/api/documents/document-1/process", {
    method: "POST",
    headers: { origin: "https://academic.example" },
  });
}

const context = { params: Promise.resolve({ id: "document-1" }) };

beforeEach(() => {
  createSupabaseServerClientMock.mockReset();
  getDriveAccessTokenMock.mockReset();
  extractTextFromDrivePdfMock.mockReset();
  getDriveAccessTokenMock.mockResolvedValue("test-drive-token");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("manual document processing claim recovery", () => {
  it("redirects safely when the atomic claim response is lost and does not start Drive work", async () => {
    const logSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const supabase = makeSupabase(() => Promise.reject(
      new Error("PRIVATE_CLAIM_TRANSPORT_SECRET"),
    ));
    createSupabaseServerClientMock.mockResolvedValue(supabase);

    const response = await POST(request() as never, context);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("process=claim_unavailable");
    expect(getDriveAccessTokenMock).not.toHaveBeenCalled();
    expect(extractTextFromDrivePdfMock).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledOnce();
    expect(logSpy).toHaveBeenCalledOnce();
    expect(String(logSpy.mock.calls[0][0])).toContain("DOCUMENT_PROCESSING_CLAIM_UNCERTAIN");
    expect(String(logSpy.mock.calls[0][0])).not.toContain("PRIVATE_CLAIM_TRANSPORT_SECRET");
  });

  it("does not start processing when the claim RPC returns an explicit database error", async () => {
    const logSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const supabase = makeSupabase(async () => ({
      data: null,
      error: { message: "PRIVATE_DATABASE_CLAIM_DETAILS" },
    }));
    createSupabaseServerClientMock.mockResolvedValue(supabase);

    const response = await POST(request() as never, context);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("process=already_processing");
    expect(getDriveAccessTokenMock).not.toHaveBeenCalled();
    expect(extractTextFromDrivePdfMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledOnce();
    expect(String(logSpy.mock.calls[0][0])).toContain("DOCUMENT_PROCESSING_CLAIM_REJECTED");
    expect(String(logSpy.mock.calls[0][0])).not.toContain("PRIVATE_DATABASE_CLAIM_DETAILS");
  });
});
