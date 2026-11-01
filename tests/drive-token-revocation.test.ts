import { afterEach, describe, expect, it, vi } from "vitest";
import { revokeDriveRefreshToken } from "../lib/drive/google";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Google Drive refresh-token revocation", () => {
  it("posts the token to Google's revocation endpoint without caching", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(revokeDriveRefreshToken("refresh-token-value")).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://oauth2.googleapis.com/revoke");
    expect(init.method).toBe("POST");
    expect(init.cache).toBe("no-store");
    expect(init.headers).toEqual({ "Content-Type": "application/x-www-form-urlencoded" });
    expect(new URLSearchParams(String(init.body)).get("token")).toBe("refresh-token-value");
  });

  it("treats an invalid or already-revoked token response as idempotent success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 400 })));
    await expect(revokeDriveRefreshToken("old-token")).resolves.toBe(true);
  });

  it("returns false for transient Google server failures so callers can retry", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
    await expect(revokeDriveRefreshToken("refresh-token-value")).resolves.toBe(false);
  });

  it("returns false for network failures instead of claiming revocation succeeded", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unavailable")));
    await expect(revokeDriveRefreshToken("refresh-token-value")).resolves.toBe(false);
  });
});
