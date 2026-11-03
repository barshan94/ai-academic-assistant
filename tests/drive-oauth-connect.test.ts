import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { createSupabaseServerClientMock, getDriveScopeMock } = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
  getDriveScopeMock: vi.fn(() => "https://www.googleapis.com/auth/drive.file"),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));
vi.mock("@/lib/drive/google", () => ({
  getDriveScope: getDriveScopeMock,
}));

import { GET } from "@/app/api/drive/connect/route";

function request() {
  return new NextRequest("https://academic.example/api/drive/connect");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("Google Drive OAuth connection initiation", () => {
  it("redirects unauthenticated users to sign-in without starting OAuth", async () => {
    createSupabaseServerClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error("no session") }) },
    });

    const response = await GET(request());

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://academic.example/login");
    expect(response.cookies.get("drive_oauth_state")).toBeUndefined();
  });

  it("fails closed with a clear status when OAuth client configuration is missing", async () => {
    createSupabaseServerClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "owner-id" } }, error: null }) },
    });
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    vi.stubEnv("GOOGLE_DRIVE_REDIRECT_URI", "");

    const response = await GET(request());

    expect(response.headers.get("location")).toBe("https://academic.example/dashboard/documents?drive=not_configured");
    expect(response.cookies.get("drive_oauth_state")).toBeUndefined();
  });

  it("creates a high-entropy account-bound state cookie and requests only drive.file offline access", async () => {
    createSupabaseServerClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "owner-id" } }, error: null }) },
    });
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("GOOGLE_CLIENT_ID", "google-client-id");
    vi.stubEnv("GOOGLE_DRIVE_REDIRECT_URI", "https://academic.example/api/drive/callback");

    const response = await GET(request());
    const location = new URL(response.headers.get("location")!);
    const cookie = response.cookies.get("drive_oauth_state");
    const [state, boundUserId] = cookie?.value.split(".") ?? [];

    expect(location.origin).toBe("https://accounts.google.com");
    expect(location.pathname).toBe("/o/oauth2/v2/auth");
    expect(location.searchParams.get("client_id")).toBe("google-client-id");
    expect(location.searchParams.get("redirect_uri")).toBe("https://academic.example/api/drive/callback");
    expect(location.searchParams.get("response_type")).toBe("code");
    expect(location.searchParams.get("scope")).toBe("https://www.googleapis.com/auth/drive.file");
    expect(location.searchParams.get("access_type")).toBe("offline");
    expect(location.searchParams.get("prompt")).toBe("consent");
    expect(location.searchParams.get("state")).toBe(state);
    expect(state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(boundUserId).toBe("owner-id");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.secure).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
    expect(cookie?.path).toBe("/api/drive/callback");
    expect(cookie?.maxAge).toBe(600);
  });
});
