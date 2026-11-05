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

const requiredEnvironment: Record<string, string> = {
  CRON_SECRET: "a".repeat(64),
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-test",
  GOOGLE_CLIENT_ID: "google-client-test",
  GOOGLE_CLIENT_SECRET: "google-secret-test",
  GOOGLE_DRIVE_REDIRECT_URI: "https://app.example.com/api/drive/callback",
  DRIVE_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
};

function authorizedRequest(secret = requiredEnvironment.CRON_SECRET) {
  return new Request("https://app.example.com/api/health/ready", {
    headers: { authorization: `Bearer ${secret}` },
  });
}

describe("GET /api/health/ready", () => {
  beforeEach(() => {
    for (const [key, value] of Object.entries(requiredEnvironment)) {
      process.env[key] = value;
    }
    getAIProviderConfigsMock.mockReturnValue([{ name: "test-provider" }]);
    createClientMock.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ error: null }),
        })),
      })),
    });
  });

  afterEach(() => {
    for (const key of Object.keys(requiredEnvironment)) delete process.env[key];
    vi.clearAllMocks();
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
    expect(client.from).toHaveBeenCalledTimes(REQUIRED_READINESS_TABLES.length);
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
});
