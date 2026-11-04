import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { createSupabaseServerClientMock, encryptRefreshTokenMock, readGoogleJsonResponseBoundedMock, logSafeOperationalEventMock } = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
  encryptRefreshTokenMock: vi.fn((token: string) => "encrypted:" + token),
  readGoogleJsonResponseBoundedMock: vi.fn(async (response: Response) => response.json()),
  logSafeOperationalEventMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));
vi.mock("@/lib/drive/crypto", () => ({
  encryptRefreshToken: encryptRefreshTokenMock,
}));
vi.mock("@/lib/drive/google", () => ({
  readGoogleJsonResponseBounded: readGoogleJsonResponseBoundedMock,
}));
vi.mock("@/lib/observability/safe-log", () => ({
  logSafeOperationalEvent: logSafeOperationalEventMock,
}));

import { GET } from "@/app/api/drive/callback/route";

const state = "random-oauth-state";
const userId = "owner-user-id";

function request(options: { query?: string; cookie?: string } = {}) {
  const query = options.query ?? new URLSearchParams({ state, code: "authorization-code" }).toString();
  return new NextRequest("https://academic.example/api/drive/callback?" + query, {
    headers: options.cookie === undefined
      ? { cookie: "drive_oauth_state=" + state + "." + userId }
      : { cookie: options.cookie },
  });
}

function configureAuthenticatedUser(id = userId, existingEncryptedToken: string | null = null) {
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const maybeSingle = vi.fn().mockResolvedValue({
    data: existingEncryptedToken ? { encrypted_refresh_token: existingEncryptedToken } : null,
    error: null,
  });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  createSupabaseServerClientMock.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id } }, error: null }) },
    from: vi.fn(() => ({ upsert, select })),
  });
  return upsert;
}

function configureOAuthEnvironment() {
  vi.stubEnv("GOOGLE_CLIENT_ID", "client-id");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "client-secret");
  vi.stubEnv("GOOGLE_DRIVE_REDIRECT_URI", "https://academic.example/api/drive/callback");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("Google Drive OAuth callback security", () => {
  it("rejects missing state before attempting authentication or token exchange", async () => {
    const response = await GET(request({ query: "code=authorization-code" }));

    expect(response.headers.get("location")).toContain("drive=invalid_callback");
    expect(createSupabaseServerClientMock).not.toHaveBeenCalled();
    expect(fetch).toBeDefined();
    expect(response.cookies.get("drive_oauth_state")?.maxAge).toBe(0);
  });

  it("rejects a state mismatch and clears the one-time state cookie", async () => {
    const response = await GET(request({
      query: new URLSearchParams({ state: "attacker-controlled-state", code: "authorization-code" }).toString(),
    }));

    expect(response.headers.get("location")).toContain("drive=invalid_callback");
    expect(createSupabaseServerClientMock).not.toHaveBeenCalled();
    expect(response.cookies.get("drive_oauth_state")?.value).toBe("");
    expect(response.cookies.get("drive_oauth_state")?.maxAge).toBe(0);
  });

  it("rejects a callback authenticated as a different account from the account that initiated OAuth", async () => {
    configureAuthenticatedUser("different-user-id");
    configureOAuthEnvironment();
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(request());

    expect(response.headers.get("location")).toContain("drive=invalid_callback");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires the exact least-privilege Drive scope before saving a connection", async () => {
    const upsert = configureAuthenticatedUser();
    configureOAuthEnvironment();
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      refresh_token: "refresh-token",
      scope: "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file",
    }), { status: 200, headers: { "content-type": "application/json" } })));

    const response = await GET(request());

    expect(response.headers.get("location")).toContain("drive=scope_mismatch");
    expect(upsert).not.toHaveBeenCalled();
    expect(encryptRefreshTokenMock).not.toHaveBeenCalled();
  });

  it("stores only the encrypted refresh token after a valid state, account and exact scope", async () => {
    const upsert = configureAuthenticatedUser();
    configureOAuthEnvironment();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      refresh_token: "refresh-token",
      scope: "https://www.googleapis.com/auth/drive.file",
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(request());

    expect(response.headers.get("location")).toBe("https://academic.example/dashboard/documents?drive=connected");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://oauth2.googleapis.com/token");
    expect(init.method).toBe("POST");
    expect(init.cache).toBe("no-store");
    expect(init.redirect).toBe("error");
    expect(new URLSearchParams(String(init.body)).get("code")).toBe("authorization-code");
    expect(encryptRefreshTokenMock).toHaveBeenCalledWith("refresh-token");
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      owner_id: userId,
      encrypted_refresh_token: "encrypted:refresh-token",
      granted_scope: "https://www.googleapis.com/auth/drive.file",
    }));
    expect(response.cookies.get("drive_oauth_state")?.maxAge).toBe(0);
  });

  it("preserves the existing encrypted refresh token when Google omits a new one", async () => {
    const upsert = configureAuthenticatedUser(userId, "existing-encrypted-refresh-token");
    configureOAuthEnvironment();
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      scope: "https://www.googleapis.com/auth/drive.file",
    }), { status: 200, headers: { "content-type": "application/json" } })));

    const response = await GET(request());

    expect(response.headers.get("location")).toContain("drive=connected");
    expect(encryptRefreshTokenMock).not.toHaveBeenCalled();
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      owner_id: userId,
      encrypted_refresh_token: "existing-encrypted-refresh-token",
      granted_scope: "https://www.googleapis.com/auth/drive.file",
    }));
  });

  it("does not create a connection when Google omits a refresh token and no prior token exists", async () => {
    const upsert = configureAuthenticatedUser();
    configureOAuthEnvironment();
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      scope: "https://www.googleapis.com/auth/drive.file",
    }), { status: 200, headers: { "content-type": "application/json" } })));

    const response = await GET(request());

    expect(response.headers.get("location")).toContain("drive=missing_refresh_token");
    expect(upsert).not.toHaveBeenCalled();
    expect(encryptRefreshTokenMock).not.toHaveBeenCalled();
  });

  it("does not expose OAuth provider response details when token exchange fails", async () => {
    configureAuthenticatedUser();
    configureOAuthEnvironment();
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      error: "invalid_grant",
      error_description: "sensitive provider detail",
    }), { status: 400, headers: { "content-type": "application/json" } })));

    const response = await GET(request());

    expect(response.headers.get("location")).toContain("drive=token_exchange_failed");
    expect(response.headers.get("location")).not.toContain("invalid_grant");
    expect(response.headers.get("location")).not.toContain("sensitive");
    expect(logSafeOperationalEventMock).toHaveBeenCalledWith("google_drive_oauth_failed", expect.objectContaining({
      errorCode: "DRIVE_TOKEN_EXCHANGE_REJECTED",
    }));
  });
});
