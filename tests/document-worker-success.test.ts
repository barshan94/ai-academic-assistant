import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createServiceClient, rpc, extractPdf } = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
  rpc: vi.fn(),
  extractPdf: vi.fn(),
}));

vi.mock("@/lib/supabase/service-role", () => ({
  createSupabaseServiceRoleClient: createServiceClient,
}));
vi.mock("@/lib/drive/crypto", () => ({
  decryptRefreshToken: vi.fn(() => "refresh-token"),
}));
vi.mock("@/lib/drive/google", () => ({
  extractTextFromDrivePdf: extractPdf,
  readGoogleJsonResponseBounded: vi.fn(async (response: Response) => response.json()),
}));
vi.mock("@/lib/observability/safe-log", () => ({
  logSafeOperationalEvent: vi.fn(),
}));

import { POST } from "@/app/api/cron/process-documents/route";

const originalEnv = {
  cron: process.env.CRON_SECRET,
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  service: process.env.SUPABASE_SERVICE_ROLE_KEY,
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
};

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

type QueryResult = { data: unknown; error: null };
type QueryBuilder = {
  select: () => QueryBuilder;
  eq: () => QueryBuilder;
  in: () => QueryBuilder;
  limit: () => QueryBuilder;
  maybeSingle: () => Promise<QueryResult>;
} & PromiseLike<QueryResult>;

function query(result: QueryResult): QueryBuilder {
  const promise = Promise.resolve(result);
  const builder = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    limit: () => builder,
    maybeSingle: async () => result,
    then: promise.then.bind(promise),
  } as QueryBuilder;
  return builder;
}

beforeEach(() => {
  process.env.CRON_SECRET = "test-cron-secret-with-sufficient-entropy";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
  process.env.GOOGLE_CLIENT_ID = "test-client";
  process.env.GOOGLE_CLIENT_SECRET = "test-secret";
  rpc.mockReset();
  extractPdf.mockReset();
  createServiceClient.mockReset();
  createServiceClient.mockReturnValue({
    rpc,
    from: (table: string) => {
      if (table === "documents") return query({ data: { id: "doc-1", drive_file_id: "drive-1", status: "processing" }, error: null });
      if (table === "drive_connections") return query({ data: { encrypted_refresh_token: "encrypted-refresh-token" }, error: null });
      if (table === "document_pages" || table === "questions" || table === "chapter_note_sources") {
        return query({ data: [], error: null });
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  });
  extractPdf.mockResolvedValue("Page one extracted text\fPage two extracted text");
  vi.stubGlobal("fetch", vi.fn(async () => new Response(
    JSON.stringify({ access_token: "test-access-token" }),
    { status: 200, headers: { "content-type": "application/json" } },
  )));
});

afterEach(() => {
  restoreEnv("CRON_SECRET", originalEnv.cron);
  restoreEnv("NEXT_PUBLIC_SUPABASE_URL", originalEnv.url);
  restoreEnv("SUPABASE_SERVICE_ROLE_KEY", originalEnv.service);
  restoreEnv("GOOGLE_CLIENT_ID", originalEnv.clientId);
  restoreEnv("GOOGLE_CLIENT_SECRET", originalEnv.clientSecret);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("document worker successful processing path", () => {
  it("refreshes Drive access, extracts pages and atomically completes the claimed job", async () => {
    rpc
      .mockResolvedValueOnce({
        data: [{
          id: "job-1",
          document_id: "doc-1",
          owner_id: "owner-1",
          status: "queued",
          started_at: null,
          attempt_count: 0,
          max_attempts: 3,
        }],
        error: null,
      })
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: 2, error: null });

    const response = await POST(new Request("https://academic.example/api/cron/process-documents", {
      method: "POST",
      headers: { authorization: "Bearer test-cron-secret-with-sufficient-entropy" },
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      processed: true,
      job_id: "job-1",
      page_count: 2,
    });
    expect(extractPdf).toHaveBeenCalledWith({
      accessToken: "test-access-token",
      driveFileId: "drive-1",
    });
    expect(rpc).toHaveBeenNthCalledWith(3, "complete_document_processing", {
      p_document_id: "doc-1",
      p_owner_id: "owner-1",
      p_job_id: "job-1",
      p_expected_attempt_count: 1,
      p_pages: ["Page one extracted text", "Page two extracted text"],
    });
  });

  it("does not complete a job when saved questions reference the existing extracted pages", async () => {
    const from = (table: string) => {
      if (table === "documents") return query({ data: { id: "doc-1", drive_file_id: "drive-1", status: "processing" }, error: null });
      if (table === "drive_connections") return query({ data: { encrypted_refresh_token: "encrypted-refresh-token" }, error: null });
      if (table === "document_pages") return query({ data: [{ id: "page-1" }], error: null });
      if (table === "questions") return query({ data: [{ id: "question-1" }], error: null });
      if (table === "chapter_note_sources") return query({ data: [], error: null });
      throw new Error(`Unexpected table: ${table}`);
    };
    createServiceClient.mockReturnValue({ rpc, from });
    rpc
      .mockResolvedValueOnce({
        data: [{
          id: "job-1",
          document_id: "doc-1",
          owner_id: "owner-1",
          status: "queued",
          started_at: null,
          attempt_count: 0,
          max_attempts: 3,
        }],
        error: null,
      })
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: true, error: null });

    const response = await POST(new Request("https://academic.example/api/cron/process-documents", {
      method: "POST",
      headers: { authorization: "Bearer test-cron-secret-with-sufficient-entropy" },
    }));

    expect(response.status).toBe(500);
    expect(extractPdf).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenNthCalledWith(3, "fail_document_processing", {
      p_document_id: "doc-1",
      p_owner_id: "owner-1",
      p_job_id: "job-1",
      p_expected_attempt_count: 1,
      p_error_code: "BACKGROUND_PROCESSING_FAILED",
    });
    expect(rpc).not.toHaveBeenCalledWith("complete_document_processing", expect.anything());
  });
});
