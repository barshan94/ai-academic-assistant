import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createServiceClient, rpc } = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/service-role", () => ({
  createSupabaseServiceRoleClient: createServiceClient,
}));
vi.mock("@/lib/drive/crypto", () => ({
  decryptRefreshToken: vi.fn(() => "refresh-token"),
}));
vi.mock("@/lib/drive/google", () => ({
  extractTextFromDrivePdf: vi.fn(),
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
};

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

beforeEach(() => {
  process.env.CRON_SECRET = "worker-test-secret";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
  rpc.mockReset();
  createServiceClient.mockReset();
  createServiceClient.mockReturnValue({ rpc });
});

afterEach(() => {
  restoreEnv("CRON_SECRET", originalEnv.cron);
  restoreEnv("NEXT_PUBLIC_SUPABASE_URL", originalEnv.url);
  restoreEnv("SUPABASE_SERVICE_ROLE_KEY", originalEnv.service);
  vi.restoreAllMocks();
});

describe("document worker request and empty-queue handling", () => {
  it("rejects missing and incorrect bearer credentials before creating a service client", async () => {
    const missing = await POST(new Request("https://academic.example/api/cron/process-documents", {
      method: "POST",
    }));
    const incorrect = await POST(new Request("https://academic.example/api/cron/process-documents", {
      method: "POST",
      headers: { authorization: "Bearer wrong-secret" },
    }));

    expect(missing.status).toBe(401);
    expect(incorrect.status).toBe(401);
    expect(await missing.json()).toEqual({ error: "Unauthorized" });
    expect(await incorrect.json()).toEqual({ error: "Unauthorized" });
    expect(createServiceClient).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns a stable empty-queue response without attempting a claim", async () => {
    rpc.mockResolvedValueOnce({ data: [], error: null });

    const response = await POST(new Request("https://academic.example/api/cron/process-documents", {
      method: "POST",
      headers: { authorization: "Bearer worker-test-secret" },
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ processed: false, reason: "queue_empty" });
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("list_claimable_document_jobs", expect.objectContaining({
      p_limit: 10,
    }));
  });
});
