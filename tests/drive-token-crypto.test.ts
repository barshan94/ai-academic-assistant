import { afterEach, describe, expect, it, vi } from "vitest";
import { decryptRefreshToken, encryptRefreshToken } from "@/lib/drive/crypto";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Google Drive refresh-token encryption", () => {
  it("encrypts and decrypts a refresh token with AES-256-GCM", () => {
    vi.stubEnv("DRIVE_TOKEN_ENCRYPTION_KEY", Buffer.alloc(32, 42).toString("base64"));
    const refreshToken = "google-refresh-token-example";
    const encrypted = encryptRefreshToken(refreshToken);

    expect(encrypted).not.toContain(refreshToken);
    expect(encrypted.split(".")).toHaveLength(4);
    expect(decryptRefreshToken(encrypted)).toBe(refreshToken);
  });

  it("rejects a tampered ciphertext", () => {
    vi.stubEnv("DRIVE_TOKEN_ENCRYPTION_KEY", Buffer.alloc(32, 7).toString("base64"));
    const encrypted = encryptRefreshToken("refresh-token");
    const parts = encrypted.split(".");
    parts[3] = (parts[3][0] === "A" ? "B" : "A") + parts[3].slice(1);

    expect(() => decryptRefreshToken(parts.join("."))).toThrow();
  });

  it("rejects an incorrectly sized encryption key", () => {
    vi.stubEnv("DRIVE_TOKEN_ENCRYPTION_KEY", Buffer.alloc(16, 1).toString("base64"));
    expect(() => encryptRefreshToken("refresh-token")).toThrow("32-byte key");
  });
});
