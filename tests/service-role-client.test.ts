import { afterEach, describe, expect, it, vi } from "vitest";

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({ createClient: createClientMock }));
vi.mock("@/lib/supabase/env", () => ({
  getPublicSupabaseEnv: () => ({ NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co" }),
}));

import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

describe("service-role Supabase transport", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    vi.clearAllMocks();
  });

  it("rejects redirects before forwarding service-role credentials", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-secret";
    createClientMock.mockReturnValue({});
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);

    createSupabaseServiceRoleClient();
    const options = createClientMock.mock.calls[0][2] as {
      global: { fetch: typeof fetch };
    };
    await options.global.fetch("https://project.supabase.co/rest/v1/profiles", {
      headers: { apikey: "service-role-test-secret" },
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][1]?.redirect).toBe("error");
  });
});
