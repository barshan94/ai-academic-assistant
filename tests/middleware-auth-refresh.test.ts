import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }));

import { createServerClient } from "@supabase/ssr";
import { middleware } from "@/middleware";

type CookieToSet = {
  name: string;
  value: string;
  options?: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "lax" | "strict" | "none";
    path?: string;
    maxAge?: number;
  };
};

function mockAuthRefresh(claims: Record<string, unknown> | null, error: Error | null = null) {
  vi.mocked(createServerClient).mockImplementation((_url, _key, options) => {
    options.cookies?.setAll?.(
      [{
        name: "sb-access-token",
        value: "refreshed-session",
        options: { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 3600 },
      } satisfies CookieToSet],
      {
        "x-auth-refresh-test": "preserved",
        "cache-control": "public, max-age=3600",
        "content-security-policy": "default-src *",
        "x-robots-tag": "index, follow",
      },
    );
    return {
      auth: {
        getClaims: async () => ({ data: { claims }, error }),
      },
    } as unknown as ReturnType<typeof createServerClient>;
  });
}

describe("middleware auth-refresh response policy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetAllMocks();
  });

  function configureAuthEnvironment() {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");
  }

  it("preserves private cache, crawler, CSP and refreshed cookie policy on authenticated requests", async () => {
    configureAuthEnvironment();
    mockAuthRefresh({ sub: "owner-id" });

    const response = await middleware(new NextRequest("https://academic.example/dashboard"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow, noarchive");
    expect(response.headers.get("Content-Security-Policy")).toContain("nonce-");
    expect(response.headers.get("x-auth-refresh-test")).toBe("preserved");

    expect(response.headers.get("Content-Security-Policy")).not.toBe("default-src *");
    expect(response.cookies.get("sb-access-token")?.value).toBe("refreshed-session");
    expect(response.cookies.get("sb-access-token")?.httpOnly).toBe(true);
    expect(response.cookies.get("sb-access-token")?.secure).toBe(true);
    expect(response.headers.get("x-middleware-request-cookie")).toContain("sb-access-token=refreshed-session");
  });

  it("preserves private cache, crawler and refreshed cookie policy on sign-in redirects", async () => {
    configureAuthEnvironment();
    mockAuthRefresh(null, new Error("expired session"));

    const response = await middleware(new NextRequest("https://academic.example/dashboard"));

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("Location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/dashboard");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow, noarchive");
    expect(response.headers.get("Content-Security-Policy")).toContain("nonce-");

    expect(response.cookies.get("sb-access-token")?.value).toBe("refreshed-session");
    expect(response.cookies.get("sb-access-token")?.httpOnly).toBe(true);
    expect(response.cookies.get("sb-access-token")?.secure).toBe(true);
  });
});
