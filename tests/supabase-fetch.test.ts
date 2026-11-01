import { afterEach, describe, expect, it, vi } from "vitest";
import { supabaseFetch } from "@/lib/supabase/fetch";

describe("Supabase fetch transport", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects redirects for authenticated Supabase requests", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);

    await supabaseFetch("https://project.supabase.co/auth/v1/user", {
      headers: { apikey: "public-test-key", Authorization: "Bearer user-session-token" },
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][1]?.redirect).toBe("error");
  });
});
