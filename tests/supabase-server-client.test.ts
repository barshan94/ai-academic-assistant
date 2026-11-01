import { afterEach, describe, expect, it, vi } from "vitest";

const { createServerClientMock, cookiesMock } = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  cookiesMock: vi.fn(async () => ({
    getAll: () => [],
    set: vi.fn(),
  })),
}));

vi.mock("@supabase/ssr", () => ({ createServerClient: createServerClientMock }));
vi.mock("next/headers", () => ({ cookies: cookiesMock }));
vi.mock("@/lib/supabase/env", () => ({
  getPublicSupabaseEnv: () => ({
    NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-test-key",
  }),
}));

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseFetch } from "@/lib/supabase/fetch";

describe("cookie-backed Supabase server client", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("uses the shared redirect-rejecting transport", async () => {
    createServerClientMock.mockReturnValue({} as never);

    await createSupabaseServerClient();

    const options = createServerClientMock.mock.calls[0][2] as {
      global: { fetch: typeof fetch };
    };
    expect(options.global.fetch).toBe(supabaseFetch);
  });
});
