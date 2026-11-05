import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createSupabaseServiceRoleClientMock, rpcMock } = vi.hoisted(() => ({
  createSupabaseServiceRoleClientMock: vi.fn(),
  rpcMock: vi.fn(),
}));

vi.mock("@/lib/supabase/service-role", () => ({
  createSupabaseServiceRoleClient: createSupabaseServiceRoleClientMock,
}));

import { POST } from "@/app/api/cron/process-documents/route";

const originalEnv = {
  cronSecret: process.env.CRON_SECRET,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
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
  createSupabaseServiceRoleClientMock.mockReturnValue({ rpc: rpcMock });
});

afterEach(() => {
  restoreEnv("CRON_SECRET", originalEnv.cronSecret);
  restoreEnv("NEXT_PUBLIC_SUPABASE_URL", originalEnv.supabaseUrl);
  restoreEnv("SUPABASE_SERVICE_ROLE_KEY", originalEnv.serviceRoleKey);
  vi.restoreAllMocks();
});

describe("document worker route access and queue preflight", () => {
  it("rejects missing or incorrect bearer credentials before creating a service-role client", async () => {
    for (const auth of [undefined, "Bearer wrong-secret", "Basic test-cron-secret-with-sufficient-entropy"]) {
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

  it("returns a safe service-unavailable response when database credentials are absent", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const response = await POST(request("Bearer test-cron-secret-with-sufficient-entropy"));
    expect(response.status).toBe(503);
    expect(createSupabaseServiceRoleClientMock).not.toHaveBeenCalled();
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

  it("does not expose database queue errors to the caller", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "private database connection details" } });

    const response = await POST(request("Bearer test-cron-secret-with-sufficient-entropy"));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Could not read the processing queue." });
    expect(JSON.stringify(body)).not.toContain("private database connection details");
  });
});
