import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  decryptDriveUploadSession,
  decryptRefreshToken,
  encryptDriveUploadSession,
  encryptRefreshToken,
} from "./crypto";

const validKey = Buffer.alloc(32, 7).toString("base64");

describe("encrypted Google Drive secrets", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("round-trips refresh tokens and upload sessions", () => {
    vi.stubEnv("DRIVE_TOKEN_ENCRYPTION_KEY", validKey);

    const refresh = encryptRefreshToken("refresh-token-value");
    const session = encryptDriveUploadSession("https://www.googleapis.com/upload/drive/v3/files?upload_id=opaque");

    expect(decryptRefreshToken(refresh)).toBe("refresh-token-value");
    expect(decryptDriveUploadSession(session)).toBe("https://www.googleapis.com/upload/drive/v3/files?upload_id=opaque");
  });

  it("rejects non-canonical encryption keys", () => {
    vi.stubEnv("DRIVE_TOKEN_ENCRYPTION_KEY", Buffer.alloc(32, 7).toString("base64url"));
    expect(() => encryptRefreshToken("refresh-token-value")).toThrow("canonical base64");
  });

  it("rejects encrypted values with extra segments", () => {
    vi.stubEnv("DRIVE_TOKEN_ENCRYPTION_KEY", validKey);
    const encrypted = encryptRefreshToken("refresh-token-value");
    expect(() => decryptRefreshToken(encrypted + ".trailing")).toThrow("unsupported format");
  });

  it("rejects non-canonical or incorrectly sized IV and tag values", () => {
    vi.stubEnv("DRIVE_TOKEN_ENCRYPTION_KEY", validKey);
    const encrypted = encryptRefreshToken("refresh-token-value");
    const [version, iv, tag, ciphertext] = encrypted.split(".");
    expect(() => decryptRefreshToken([version, iv.slice(1), tag, ciphertext].join(".")).toThrow();
    expect(() => decryptRefreshToken([version, iv, tag.slice(1), ciphertext].join(".")).toThrow();
  });

  it("rejects empty and oversized values before encryption", () => {
    vi.stubEnv("DRIVE_TOKEN_ENCRYPTION_KEY", validKey);
    expect(() => encryptRefreshToken("")).toThrow("empty");
    expect(() => encryptRefreshToken("x".repeat(16 * 1024 + 1))).toThrow("storage limit");
  });
});
