import { describe, expect, it } from "vitest";
import {
  passwordHashAlgorithm,
  readJsonResponse,
  remainingBanDuration,
  validateBackup,
} from "../scripts/restore-auth-users.mjs";

const baseUser = {
  id: "11111111-1111-4111-8111-111111111111",
  aud: "authenticated",
  role: "authenticated",
  email: "owner@example.com",
  phone: null,
  password_hash: "$2b$10$" + "A".repeat(53),
  email_confirm: true,
  phone_confirm: false,
  user_metadata: {},
  app_metadata: { provider: "email", providers: ["email"] },
  identity_providers: ["email"],
  mfa_factor_count: 0,
  is_anonymous: false,
  is_sso_user: false,
  banned_until: null,
};

function backup(user = baseUser) {
  return { formatVersion: 1, projectRef: "uqpyzicftxxegajaocxi", users: [user] };
}

describe("Auth account backup validation", () => {
  it("accepts a supported email/password account and preserves the source project reference", () => {
    expect(validateBackup(backup())).toEqual([baseUser]);
  });

  it("rejects a missing source project reference and malformed UUID", () => {
    expect(() => validateBackup({ ...backup(), projectRef: undefined })).toThrow("source project reference");
    expect(() => validateBackup(backup({ ...baseUser, id: "not-a-uuid" }))).toThrow("UUID v4");
  });

  it("identifies supported password hash algorithms and rejects mixed backups", () => {
    const argon2Hash = "$argon2id$v=19$m=65536,t=3,p=4$" + "A".repeat(22) + "$" + "B".repeat(43);
    expect(passwordHashAlgorithm(baseUser.password_hash)).toBe("bcrypt");
    expect(passwordHashAlgorithm(argon2Hash)).toBe("argon2");
    expect(validateBackup(backup({ ...baseUser, password_hash: argon2Hash }))).toHaveLength(1);
    expect(() => validateBackup({
      formatVersion: 1,
      projectRef: "uqpyzicftxxegajaocxi",
      users: [
        baseUser,
        { ...baseUser, id: "22222222-2222-4222-8222-222222222222", email: "teacher@example.com", password_hash: argon2Hash },
      ],
    })).toThrow("mixes password-hash algorithms");
  });

  it("rejects plaintext passwords and unsupported account types", () => {
    expect(() => validateBackup(backup({ ...baseUser, password_hash: "plaintext-password" }))).toThrow("bcrypt or Argon2");
    expect(() => validateBackup(backup({ ...baseUser, phone: "+15555550100" }))).toThrow("Phone-based");
    expect(() => validateBackup(backup({ ...baseUser, phone_confirm: true }))).toThrow("Phone-based");
    expect(() => validateBackup(backup({ ...baseUser, identity_providers: ["email", "google"] }))).toThrow("Only email-identity");
    expect(() => validateBackup(backup({ ...baseUser, app_metadata: { provider: "email", providers: ["email", "google"] } }))).toThrow("email-provider");
    expect(() => validateBackup(backup({ ...baseUser, mfa_factor_count: 1 }))).toThrow("MFA factors");
    expect(() => validateBackup(backup({ ...baseUser, is_sso_user: true }))).toThrow("MFA factors");
    expect(() => validateBackup(backup({ ...baseUser, is_anonymous: true }))).toThrow("MFA factors");
    expect(() => validateBackup(backup({ ...baseUser, mfa_factor_count: "0" }))).toThrow("MFA, anonymous or SSO state");
    expect(() => validateBackup(backup({ ...baseUser, phone: undefined }))).toThrow("phone field");
  });

  it("rejects duplicate account IDs and case-insensitive email addresses", () => {
    expect(() => validateBackup({
      formatVersion: 1,
      projectRef: "uqpyzicftxxegajaocxi",
      users: [baseUser, { ...baseUser, id: "22222222-2222-4222-8222-222222222222", email: "OWNER@example.com" }],
    })).toThrow("duplicate");
  });

  it("converts only active account bans to a remaining duration", () => {
    expect(remainingBanDuration(new Date(Date.now() + 60_000).toISOString())).toMatch(/s$/);
    expect(remainingBanDuration(new Date(Date.now() - 60_000).toISOString())).toBeUndefined();
    expect(remainingBanDuration(null)).toBeUndefined();
  });
});

describe("bounded Auth API response reader", () => {
  it("parses a small JSON response", async () => {
    await expect(readJsonResponse(new Response(JSON.stringify({ id: "user-id" })))).resolves.toEqual({ id: "user-id" });
  });

  it("rejects oversized and invalid UTF-8 responses", async () => {
    await expect(readJsonResponse(new Response("x".repeat(256 * 1024 + 1)))).rejects.toThrow("256 KiB");
    await expect(readJsonResponse(new Response(new Uint8Array([0xff, 0xfe])))).rejects.toThrow("invalid JSON");
  });
});
