import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { searchWebSources } from "@/lib/research/web-search";

describe("web research request safety", () => {
  it("rejects redirects on the credential-bearing Brave request", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      web: {
        results: [{
          title: "Example source",
          url: "https://example.org/article",
          description: "A source lead for manual review.",
        }],
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const results = await searchWebSources("exam syllabus", fetcher, {
      WEB_SEARCH_PROVIDER: "brave",
      BRAVE_SEARCH_API_KEY: "test-search-key",
    });

    expect(results).toHaveLength(1);
    const [, init] = fetcher.mock.calls[0];
    expect(init?.redirect).toBe("error");
    expect((init?.headers as Record<string, string>)["X-Subscription-Token"]).toBe("test-search-key");
  });

  it("does not retry or follow a rejected redirect", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("redirect rejected"));

    await expect(searchWebSources("exam syllabus", fetcher, {
      WEB_SEARCH_PROVIDER: "brave",
      BRAVE_SEARCH_API_KEY: "test-search-key",
    })).rejects.toThrow("WEB_RESEARCH_UNAVAILABLE");
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0][1]?.redirect).toBe("error");
  });
});
