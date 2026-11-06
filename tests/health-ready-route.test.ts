import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock, getAIProviderConfigsMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getAIProviderConfigsMock: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({ createClient: createClientMock }));
vi.mock("@/lib/ai/provider", () => ({
  getAIProviderConfigs: getAIProviderConfigsMock,
}));

import { GET } from "@/app/api/health/ready/route";
import { REQUIRED_READINESS_TABLES } from "@/lib/health/required-readiness-tables";
import { runBoundedChecks } from "@/lib/health/run-bounded-checks";

const requiredEnvironment: Record<string, string> = {
  CRON_SECRET: "a".repeat(64),
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-test",
  GOOGLE_CLIENT_ID: "google-client-test",
  GOOGLE_CLIENT_SECRET: "google-secret-test",
  GOOGLE_DRIVE_REDIRECT_URI: "https://app.example.com/api/drive/callback",
  DRIVE_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
  AI_ENABLED: "true",
};

let originalEnvironment: Record<string, string | undefined> = {};

function authorizedRequest(secret = requiredEnvironment.CRON_SECRET) {
  return new Request("https://app.example.com/api/health/ready", {
    headers: { authorization: `Bearer ${secret}` },
  });
}

describe("GET /api/health/ready", () => {
  beforeEach(() => {
    originalEnvironment = Object.fromEntries(
      Object.keys(requiredEnvironment).map((key) => [key, process.env[key]]),
    );
    for (const [key, value] of Object.entries(requiredEnvironment)) {
      process.env[key] = value;
    }
    getAIProviderConfigsMock.mockReset();
    getAIProviderConfigsMock.mockReturnValue([{ name: "test-provider" }]);
    createClientMock.mockReset();
    createClientMock.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ error: null }),
        })),
      })),
      rpc: vi.fn().mockResolvedValue({ data: null, error: { code: "P0001" } }),
    });
  });

  afterEach(() => {
    for (const key of Object.keys(requiredEnvironment)) {
      const original = originalEnvironment[key];
      if (original === undefined) delete process.env[key];
      else process.env[key] = original;
    }
    originalEnvironment = {};
  });

  it("rejects missing or incorrect bearer credentials without probing services", async () => {
    const missing = await GET(new Request("https://app.example.com/api/health/ready"));
    const incorrect = await GET(authorizedRequest("wrong-secret"));

    expect(missing.status).toBe(401);
    expect(incorrect.status).toBe(401);
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("returns ready only after configuration, AI tasks and every required table pass", async () => {
    const response = await GET(authorizedRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ready" });
    expect(getAIProviderConfigsMock).toHaveBeenCalledWith("answer");
    expect(getAIProviderConfigsMock).toHaveBeenCalledWith("chapter-note");
    expect(createClientMock).toHaveBeenCalledOnce();
    const client = createClientMock.mock.results[0].value;
    expect(client.from).toHaveBeenCalledTimes(REQUIRED_READINESS_TABLES.length + 1);
    expect(client.rpc).toHaveBeenCalledTimes(2);
    expect(client.rpc).toHaveBeenCalledWith("complete_document_processing", expect.objectContaining({
      p_expected_attempt_count: 0,
    }));
    expect(client.rpc).toHaveBeenCalledWith("fail_document_processing", expect.objectContaining({
      p_expected_attempt_count: 0,
    }));
  });

  it("accepts strict zero-cost mode without probing disabled AI providers", async () => {
    process.env.AI_ENABLED = "false";
    getAIProviderConfigsMock.mockImplementation(() => {
      throw new Error("AI is intentionally disabled");
    });

    const response = await GET(authorizedRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ready" });
    expect(getAIProviderConfigsMock).not.toHaveBeenCalled();
    expect(createClientMock).toHaveBeenCalledOnce();
  });

  it("fails closed when a required AI task has no configured provider", async () => {
    getAIProviderConfigsMock.mockImplementation((task: string) => {
      if (task === "chapter-note") throw new Error("provider unavailable");
      return [{ name: "test-provider" }];
    });

    const response = await GET(authorizedRequest());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "not_ready" });
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("fails closed when the attempt-fenced worker RPC migrations are missing", async () => {
    const client = createClientMock.mock.results[0]?.value;
    client.rpc.mockImplementation((name: string) => Promise.resolve({
      data: null,
      error: { code: name === "complete_document_processing" ? "PGRST202" : "P0001" },
    }));

    const response = await GET(authorizedRequest());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "not_ready" });
  });

  it("fails closed when the source page-count column is missing", async () => {
    createClientMock.mockReturnValue({
      from: vi.fn((table: string) => ({
        select: vi.fn((column: string) => ({
          limit: vi.fn().mockResolvedValue({
            error: table === "documents" && column === "source_page_count" ? { code: "42703" } : null,
          }),
        })),
      })),
      rpc: vi.fn().mockResolvedValue({ data: null, error: { code: "P0001" } }),
    });

    const response = await GET(authorizedRequest());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "not_ready" });
  });

  it("fails closed when a required database table cannot be probed", async () => {
    let probeCount = 0;
    createClientMock.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          limit: vi.fn(async () => {
            probeCount += 1;
            return { error: probeCount === 1 ? { code: "42P01" } : null };
          }),
        })),
      })),
    });

    const response = await GET(authorizedRequest());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "not_ready" });
    expect(probeCount).toBe(5);
  });

  it("fails closed when a database readiness probe throws unexpectedly", async () => {
    createClientMock.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          limit: vi.fn().mockRejectedValue(new Error("private network and database details")),
        })),
      })),
    });

    const response = await GET(authorizedRequest());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "not_ready" });
  });
});

describe("runBoundedChecks", () => {
  it("never runs more checks concurrently than the configured batch size", async () => {
    let active = 0;
    let maximumActive = 0;

    const result = await runBoundedChecks([1, 2, 3, 4, 5, 6, 7], 3, async () => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await Promise.resolve();
      active -= 1;
      return true;
    });

    expect(result).toBe(true);
    expect(maximumActive).toBe(3);
    expect(active).toBe(0);
  });

  it("stops before starting later batches when any check fails", async () => {
    const checked: number[] = [];

    const result = await runBoundedChecks([1, 2, 3, 4, 5], 2, async (value) => {
      checked.push(value);
      return value !== 2;
    });

    expect(result).toBe(false);
    expect(checked).toEqual([1, 2]);
  });

  it("returns true for an empty list without invoking the checker", async () => {
    let calls = 0;

    const result = await runBoundedChecks([], 2, async () => {
      calls += 1;
      return true;
    });

    expect(result).toBe(true);
    expect(calls).toBe(0);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid batch size %s",
    async (batchSize) => {
      await expect(
        runBoundedChecks([1], batchSize, async () => true),
      ).rejects.toThrow("batchSize must be a positive integer");
    },
  );

  it("propagates checker exceptions so the caller can fail closed", async () => {
    await expect(
      runBoundedChecks([1, 2], 2, async (value) => {
        if (value === 1) throw new Error("probe failed");
        return true;
      }),
    ).rejects.toThrow("probe failed");
  });
});
