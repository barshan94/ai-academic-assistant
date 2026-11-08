import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createSupabaseServiceRoleClientMock, rpcMock, extractTextFromDrivePdfMock } = vi.hoisted(() => ({
  createSupabaseServiceRoleClientMock: vi.fn(),
  rpcMock: vi.fn(),
  extractTextFromDrivePdfMock: vi.fn(),
}));

vi.mock("@/lib/supabase/service-role", () => ({
  createSupabaseServiceRoleClient: createSupabaseServiceRoleClientMock,
}));

vi.mock("@/lib/drive/crypto", () => ({
  decryptRefreshToken: vi.fn(() => "decrypted-test-refresh-token"),
}));

vi.mock("@/lib/drive/google", () => ({
  extractTextFromDrivePdf: extractTextFromDrivePdfMock,
  readGoogleJsonResponseBounded: vi.fn(async (response: Response) => response.json()),
}));

import { POST } from "@/app/api/cron/process-documents/route";

const originalEnv = {
  cronSecret: process.env.CRON_SECRET,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
};

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function request(authorization?: string) {
  return new Request("https://academic.example/api/cron/process-documents", {
    method: "POST",
    headers: authorization ? { authorization } : undefined,
  });
}

beforeEach(() => {
  process.env.CRON_SECRET = "test-cron-secret-with-sufficient-entropy";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test-project.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  rpcMock.mockReset();
  createSupabaseServiceRoleClientMock.mockReset();
  extractTextFromDrivePdfMock.mockReset();
  createSupabaseServiceRoleClientMock.mockReturnValue({ rpc: rpcMock });
});

afterEach(() => {
  restoreEnv("CRON_SECRET", originalEnv.cronSecret);
  restoreEnv("NEXT_PUBLIC_SUPABASE_URL", originalEnv.supabaseUrl);
  restoreEnv("SUPABASE_SERVICE_ROLE_KEY", originalEnv.serviceRoleKey);
  restoreEnv("GOOGLE_CLIENT_ID", originalEnv.googleClientId);
  restoreEnv("GOOGLE_CLIENT_SECRET", originalEnv.googleClientSecret);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("document worker route access and queue preflight", () => {
  it("rejects missing or incorrect bearer credentials before creating a service-role client", async () => {
    for (const auth of [
      undefined,
      "Bearer wrong-secret",
      "Basic test-cron-secret-with-sufficient-entropy",
      "test-cron-secret-with-sufficient-entropy",
      "Bearer",
      "Bearer test-cron-secret-with-sufficient-entropy extra",
    ]) {
      const response = await POST(request(auth));
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
    }
    expect(createSupabaseServiceRoleClientMock).not.toHaveBeenCalled();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("rejects a missing cron secret even if the caller supplies a bearer value", async () => {
    delete process.env.CRON_SECRET;
    const response = await POST(request("Bearer test-cron-secret-with-sufficient-entropy"));
    expect(response.status).toBe(401);
    expect(createSupabaseServiceRoleClientMock).not.toHaveBeenCalled();
  });

  it("rejects a configured cron secret shorter than 32 characters", async () => {
    process.env.CRON_SECRET = "short";
    const response = await POST(request("Bearer short"));
    expect(response.status).toBe(401);
    expect(createSupabaseServiceRoleClientMock).not.toHaveBeenCalled();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("returns a safe service-unavailable response when database credentials are absent", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const response = await POST(request("Bearer test-cron-secret-with-sufficient-entropy"));
    expect(response.status).toBe(503);
    expect(createSupabaseServiceRoleClientMock).not.toHaveBeenCalled();
  });

  it("returns a safe retryable response when service-role client initialization throws", async () => {
    const logSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    createSupabaseServiceRoleClientMock.mockImplementationOnce(() => {
      throw new Error("private service-role initialization details");
    });

    const response = await POST(request("Bearer test-cron-secret-with-sufficient-entropy"));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "The document worker database is temporarily unavailable.",
    });
    expect(rpcMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledOnce();
    const loggedPayload = String(logSpy.mock.calls[0][0]);
    expect(loggedPayload).toContain('"event":"document_worker_client_init_failed"');
    expect(loggedPayload).toContain('"errorCode":"DOCUMENT_WORKER_DATABASE_UNAVAILABLE"');
    expect(loggedPayload).not.toContain("private service-role initialization details");
  });

  it("uses the claimable-job RPC with a bounded batch and reports an empty queue", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });

    const response = await POST(request("Bearer test-cron-secret-with-sufficient-entropy"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ processed: false, reason: "queue_empty" });
    expect(rpcMock).toHaveBeenCalledOnce();
    expect(rpcMock).toHaveBeenCalledWith("list_claimable_document_jobs", {
      p_stale_before: expect.any(String),
      p_limit: 10,
    });
    expect(Number.isNaN(Date.parse(rpcMock.mock.calls[0][1].p_stale_before))).toBe(false);
  });

  it("does not process a job when another worker wins the atomic claim race", async () => {
    rpcMock
      .mockResolvedValueOnce({
        data: [{
          id: "job-1",
          document_id: "document-1",
          owner_id: "owner-1",
          status: "queued",
          started_at: null,
          attempt_count: 0,
          max_attempts: 3,
        }],
        error: null,
      })
      .mockResolvedValueOnce({ data: false, error: null });

    const response = await POST(request("Bearer test-cron-secret-with-sufficient-entropy"));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      processed: false,
      job_id: "document-claim-error",
      error: "Document processing claim is being reconciled. Check the document status before retrying.",
    });
    expect(rpcMock).toHaveBeenCalledTimes(2);
    expect(rpcMock).toHaveBeenNthCalledWith(2, "claim_document_processing_job", {
      p_document_id: "document-1",
      p_owner_id: "owner-1",
      p_job_id: "job-1",
      p_expected_status: "queued",
      p_expected_attempt_count: 0,
      p_expected_started_at: null,
    });
  });

  it("skips a fresh running job and continues to the next claimable candidate", async () => {
    rpcMock
      .mockResolvedValueOnce({
        data: [
          {
            id: "job-fresh-running",
            document_id: "document-fresh-running",
            owner_id: "owner-1",
            status: "running",
            started_at: new Date().toISOString(),
            attempt_count: 1,
            max_attempts: 3,
          },
          {
            id: "job-next",
            document_id: "document-next",
            owner_id: "owner-2",
            status: "queued",
            started_at: null,
            attempt_count: 0,
            max_attempts: 3,
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({ data: false, error: null });

    const response = await POST(request("Bearer test-cron-secret-with-sufficient-entropy"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ processed: false, reason: "no_claimable_job" });
    expect(rpcMock).toHaveBeenCalledTimes(2);
    expect(rpcMock).toHaveBeenNthCalledWith(2, "claim_document_processing_job", {
      p_document_id: "document-next",
      p_owner_id: "owner-2",
      p_job_id: "job-next",
      p_expected_status: "queued",
      p_expected_attempt_count: 0,
      p_expected_started_at: null,
    });
  });

  it("returns a safe retryable response when stale-job terminalization outcome is uncertain", async () => {
    const staleStartedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const logSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    rpcMock
      .mockResolvedValueOnce({ data: [{
        id: "job-exhausted", document_id: "document-2", owner_id: "owner-2",
        status: "running", started_at: staleStartedAt, attempt_count: 3, max_attempts: 3,
      }], error: null })
      .mockRejectedValueOnce(new Error("private terminalization transport details"));

    const response = await POST(request("Bearer test-cron-secret-with-sufficient-entropy"));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      processed: false,
      job_id: "job-exhausted",
      error: "Stale document recovery is being reconciled. Check the document status before retrying.",
    });
    expect(rpcMock).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenCalledOnce();
    const loggedPayload = String(logSpy.mock.calls[0][0]);
    expect(loggedPayload).toContain("DOCUMENT_STALE_RECOVERY_UNCERTAIN");
    expect(loggedPayload).not.toContain("private terminalization transport details");
  });

  it("terminalizes an exhausted stale job without attempting another claim", async () => {
    const staleStartedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    rpcMock
      .mockResolvedValueOnce({
        data: [{
          id: "job-exhausted",
          document_id: "document-2",
          owner_id: "owner-2",
          status: "running",
          started_at: staleStartedAt,
          attempt_count: 3,
          max_attempts: 3,
        }],
        error: null,
      })
      .mockResolvedValueOnce({ data: true, error: null });

    const response = await POST(request("Bearer test-cron-secret-with-sufficient-entropy"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ processed: false, reason: "no_claimable_job" });
    expect(rpcMock).toHaveBeenCalledTimes(2);
    expect(rpcMock).toHaveBeenNthCalledWith(2, "terminalize_exhausted_stale_document_job", {
      p_document_id: "document-2",
      p_owner_id: "owner-2",
      p_job_id: "job-exhausted",
      p_expected_started_at: staleStartedAt,
    });
  });

  it("returns a generic response and logs only allow-listed metadata when the queue transport promise rejects", async () => {
    const logSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    rpcMock.mockRejectedValueOnce(
      new Error("private queue transport failure and connection string"),
    );

    const response = await POST(request("Bearer test-cron-secret-with-sufficient-entropy"));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Could not read the processing queue." });
    expect(JSON.stringify(body)).not.toContain("private");
    expect(JSON.stringify(body)).not.toContain("connection string");
    expect(JSON.stringify(body)).not.toContain("transport failure");
    expect(logSpy).toHaveBeenCalledOnce();
    const loggedPayload = String(logSpy.mock.calls[0][0]);
    expect(loggedPayload).toContain('"event":"document_queue_read_failed"');
    expect(loggedPayload).toContain('"errorCode":"DOCUMENT_QUEUE_READ_FAILED"');
    expect(loggedPayload).not.toContain("private");
    expect(loggedPayload).not.toContain("connection string");
    expect(loggedPayload).not.toContain("transport failure");
  });

  it("does not expose database queue errors to the caller", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "private database connection details" } });

    const response = await POST(request("Bearer test-cron-secret-with-sufficient-entropy"));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Could not read the processing queue." });
    expect(JSON.stringify(body)).not.toContain("private database connection details");
  });

  it("returns a safe retryable response when atomic claim outcome is uncertain", async () => {
    const logSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    rpcMock
      .mockResolvedValueOnce({ data: [{
        id: "job-claim-reject", document_id: "document-claim-reject", owner_id: "owner-claim-reject",
        status: "queued", started_at: null, attempt_count: 0, max_attempts: 3,
      }], error: null })
      .mockRejectedValueOnce(new Error("private claim transport details"));

    const response = await POST(request("Bearer test-cron-secret-with-sufficient-entropy"));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      processed: false,
      job_id: "job-claim-reject",
      error: "Document processing claim is being reconciled. Check the document status before retrying.",
    });
    expect(rpcMock).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenCalledOnce();
    expect(String(logSpy.mock.calls[0][0])).toContain("DOCUMENT_JOB_CLAIM_UNCERTAIN");
    expect(String(logSpy.mock.calls[0][0])).not.toContain("private claim transport details");
  });

  it("does not process a candidate when the atomic claim RPC returns an error", async () => {
    rpcMock
      .mockResolvedValueOnce({
        data: [{
          id: "job-claim-error",
          document_id: "document-claim-error",
          owner_id: "owner-claim-error",
          status: "queued",
          started_at: null,
          attempt_count: 0,
          max_attempts: 3,
        }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "private claim transaction details" },
      });

    const response = await POST(request("Bearer test-cron-secret-with-sufficient-entropy"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ processed: false, reason: "no_claimable_job" });
    expect(rpcMock).toHaveBeenCalledTimes(2);
    expect(rpcMock).toHaveBeenNthCalledWith(2, "claim_document_processing_job", {
      p_document_id: "document-claim-error",
      p_owner_id: "owner-claim-error",
      p_job_id: "job-claim-error",
      p_expected_status: "queued",
      p_expected_attempt_count: 0,
      p_expected_started_at: null,
    });
  });

  it("does not expose a failed claim's database error in its response", async () => {
    rpcMock
      .mockResolvedValueOnce({
        data: [{
          id: "job-claim-error",
          document_id: "document-claim-error",
          owner_id: "owner-claim-error",
          status: "queued",
          started_at: null,
          attempt_count: 0,
          max_attempts: 3,
        }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "private claim transaction details" },
      });

    const response = await POST(request("Bearer test-cron-secret-with-sufficient-entropy"));
    const body = await response.json();

    expect(JSON.stringify(body)).not.toContain("private claim transaction details");
  });

});


describe("document worker failure redaction", () => {
  it("persists a generic failure and never returns upstream OCR exception details", async () => {
    process.env.GOOGLE_CLIENT_ID = "test-google-client";
    process.env.GOOGLE_CLIENT_SECRET = "test-google-secret";

    type QueryResult = { data: unknown; error: null };
    type QueryBuilder = Promise<QueryResult> & {
      select: () => QueryBuilder;
      eq: (column: string, value: string) => QueryBuilder;
      maybeSingle: () => Promise<QueryResult>;
    };
    const queryFor = (result: QueryResult): QueryBuilder => {
      const query: QueryBuilder = Object.assign(Promise.resolve(result), {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => result,
      });
      return query;
    };

    const fromMock = vi.fn((table: string) => {
      if (table === "documents") {
        return queryFor({ data: { id: "document-1", drive_file_id: "drive-file-1", status: "processing", file_size_bytes: 32, sha256: "a".repeat(64) }, error: null });
      }
      if (table === "drive_connections") {
        return queryFor({ data: { encrypted_refresh_token: "encrypted-test-token" }, error: null });
      }
      if (table === "document_pages") return queryFor({ data: [], error: null });
      throw new Error(`Unexpected table access: ${table}`);
    });

    createSupabaseServiceRoleClientMock.mockReturnValue({ rpc: rpcMock, from: fromMock });
    rpcMock
      .mockResolvedValueOnce({
        data: [{
          id: "job-1",
          document_id: "document-1",
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
    extractTextFromDrivePdfMock.mockRejectedValueOnce(
      new Error("UPSTREAM_SECRET_DO_NOT_RETURN: private OCR response and credential"),
    );
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      JSON.stringify({ access_token: "test-access-token" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )));

    const response = await POST(request("Bearer test-cron-secret-with-sufficient-entropy"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      processed: false,
      job_id: "job-1",
      failed: true,
      error: "Document processing failed. Reconnect Google Drive if the problem persists.",
    });
    expect(JSON.stringify(body)).not.toContain("UPSTREAM_SECRET_DO_NOT_RETURN");
    expect(rpcMock).toHaveBeenNthCalledWith(3, "fail_document_processing", {
      p_document_id: "document-1",
      p_owner_id: "owner-1",
      p_job_id: "job-1",
      p_expected_attempt_count: 1,
      p_error_code: "BACKGROUND_PROCESSING_FAILED",
    });
    expect(extractTextFromDrivePdfMock).toHaveBeenCalledOnce();
  });

  it("returns a distinct generic response when failure persistence itself fails", async () => {
    process.env.GOOGLE_CLIENT_ID = "test-google-client";
    process.env.GOOGLE_CLIENT_SECRET = "test-google-secret";
    const logSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    type QueryResult = { data: unknown; error: null };
    type QueryBuilder = Promise<QueryResult> & {
      select: () => QueryBuilder;
      eq: (column: string, value: string) => QueryBuilder;
      maybeSingle: () => Promise<QueryResult>;
    };
    const queryFor = (result: QueryResult): QueryBuilder => {
      const query: QueryBuilder = Object.assign(Promise.resolve(result), {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => result,
      });
      return query;
    };
    const fromMock = vi.fn((table: string) => {
      if (table === "documents") {
        return queryFor({ data: { id: "document-1", drive_file_id: "drive-file-1", status: "processing", file_size_bytes: 32, sha256: "a".repeat(64) }, error: null });
      }
      if (table === "drive_connections") {
        return queryFor({ data: { encrypted_refresh_token: "encrypted-test-token" }, error: null });
      }
      if (table === "document_pages") return queryFor({ data: [], error: null });
      throw new Error(`Unexpected table access: ${table}`);
    });

    createSupabaseServiceRoleClientMock.mockReturnValue({ rpc: rpcMock, from: fromMock });
    rpcMock
      .mockResolvedValueOnce({
        data: [{
          id: "job-1",
          document_id: "document-1",
          owner_id: "owner-1",
          status: "queued",
          started_at: null,
          attempt_count: 0,
          max_attempts: 3,
        }],
        error: null,
      })
      .mockResolvedValueOnce({ data: true, error: null })
      .mockRejectedValueOnce(
        new Error("private database transport failure and connection string"),
      );
    extractTextFromDrivePdfMock.mockRejectedValueOnce(new Error("private OCR provider response"));
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      JSON.stringify({ access_token: "test-access-token" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )));

    const response = await POST(request("Bearer test-cron-secret-with-sufficient-entropy"));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      processed: false,
      job_id: "job-1",
      error: "Processing failure state is uncertain. Check the document status before retrying.",
    });
    expect(logSpy).toHaveBeenCalledTimes(2);
    const logs = logSpy.mock.calls.map((call) => String(call[0])).join("\\n");
    expect(logs).toContain("DOCUMENT_PROCESSING_FAILURE_UNCERTAIN");
    expect(logs).not.toContain("private database transport failure");
    expect(logs).not.toContain("private OCR provider response");
    expect(JSON.stringify(body)).not.toContain("private");
    expect(JSON.stringify(body)).not.toContain("connection string");
    expect(JSON.stringify(body)).not.toContain("transport failure");
    expect(rpcMock).toHaveBeenNthCalledWith(3, "fail_document_processing", {
      p_document_id: "document-1",
      p_owner_id: "owner-1",
      p_job_id: "job-1",
      p_expected_attempt_count: 1,
      p_error_code: "BACKGROUND_PROCESSING_FAILED",
    });
  });


  it("does not invoke failure persistence when completion may already have committed", async () => {
    process.env.GOOGLE_CLIENT_ID = "test-google-client";
    process.env.GOOGLE_CLIENT_SECRET = "test-google-secret";
    const logSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    type QueryResult = { data: unknown; error: null };
    type QueryBuilder = Promise<QueryResult> & {
      select: () => QueryBuilder;
      eq: (column: string, value: string) => QueryBuilder;
      maybeSingle: () => Promise<QueryResult>;
    };
    const queryFor = (result: QueryResult): QueryBuilder => {
      let builder: QueryBuilder;
      builder = Object.assign(Promise.resolve(result), {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => result,
      }) as QueryBuilder;
      return builder;
    };
    const fromMock = vi.fn((table: string) => {
      if (table === "documents") return queryFor({ data: {
        id: "document-1", drive_file_id: "drive-file-1", status: "processing",
        file_size_bytes: 32, sha256: "a".repeat(64),
      }, error: null });
      if (table === "drive_connections") return queryFor({
        data: { encrypted_refresh_token: "encrypted-test-token" }, error: null,
      });
      if (table === "document_pages") return queryFor({ data: [], error: null });
      throw new Error("Unexpected table access: " + table);
    });

    createSupabaseServiceRoleClientMock.mockReturnValue({ rpc: rpcMock, from: fromMock });
    rpcMock
      .mockResolvedValueOnce({ data: [{
        id: "job-1", document_id: "document-1", owner_id: "owner-1",
        status: "queued", started_at: null, attempt_count: 0, max_attempts: 3,
      }], error: null })
      .mockResolvedValueOnce({ data: true, error: null })
      .mockRejectedValueOnce(new Error("PRIVATE_COMPLETION_TRANSPORT_DETAILS"));
    extractTextFromDrivePdfMock.mockResolvedValueOnce("Extracted document text");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      JSON.stringify({ access_token: "test-access-token" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )));

    const response = await POST(request("Bearer test-cron-secret-with-sufficient-entropy"));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      processed: false,
      job_id: "job-1",
      error: "Processing completion is being reconciled. Check the document status before retrying.",
    });
    expect(rpcMock).toHaveBeenCalledTimes(3);
    expect(rpcMock).toHaveBeenNthCalledWith(3, "complete_document_processing", expect.objectContaining({
      p_document_id: "document-1",
      p_owner_id: "owner-1",
      p_job_id: "job-1",
      p_expected_attempt_count: 1,
    }));
    expect(rpcMock).not.toHaveBeenCalledWith("fail_document_processing", expect.anything());
    expect(logSpy).toHaveBeenCalledOnce();
    expect(String(logSpy.mock.calls[0][0])).toContain("DOCUMENT_PROCESSING_COMPLETION_UNCERTAIN");
    expect(String(logSpy.mock.calls[0][0])).not.toContain("PRIVATE_COMPLETION_TRANSPORT_DETAILS");
  });
});
