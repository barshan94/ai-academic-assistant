#!/usr/bin/env node

import { readFile, lstat } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
const MAX_USERS = 1000;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
const ARGON2_HASH = /^\$argon2(id|i|d)\$[A-Za-z0-9$=+,/._-]{20,}$/;

function fail(message) {
  process.stderr.write(`Auth restore failed: ${message}\n`);
  process.exitCode = 1;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function passwordHashAlgorithm(hash) {
  if (typeof hash !== "string") return null;
  if (BCRYPT_HASH.test(hash)) return "bcrypt";
  if (ARGON2_HASH.test(hash)) return "argon2";
  return null;
}

export function validateBackup(value) {
  if (!isRecord(value) || value.formatVersion !== 1 || !Array.isArray(value.users)) {
    throw new Error("Backup must use formatVersion 1 and contain a users array.");
  }
  if (typeof value.projectRef !== "string" || !/^[a-z0-9-]{5,40}$/.test(value.projectRef)) {
    throw new Error("Auth backup is missing its source project reference.");
  }
  if (value.users.length > MAX_USERS) throw new Error("Backup exceeds the 1,000-account safety limit.");

  const ids = new Set();
  const emails = new Set();
  const hashAlgorithms = new Set();

  for (const user of value.users) {
    if (!isRecord(user)) throw new Error("An account record is malformed.");
    if (typeof user.id !== "string" || !UUID_V4.test(user.id)) throw new Error("An account has an invalid UUID v4 ID.");
    if (typeof user.email !== "string" || user.email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
      throw new Error("An account has an invalid email address.");
    }
    const hashAlgorithm = passwordHashAlgorithm(user.password_hash);
    if (!hashAlgorithm) {
      throw new Error("Every account must have a supported bcrypt or Argon2 password hash; plaintext passwords are not accepted.");
    }
    hashAlgorithms.add(hashAlgorithm);
    if (!Array.isArray(user.identity_providers) || user.identity_providers.length !== 1 || user.identity_providers[0] !== "email") {
      throw new Error("Only email-identity accounts are supported by this restore workflow.");
    }
    if (Number(user.mfa_factor_count) !== 0 || user.is_anonymous === true || user.is_sso_user === true) {
      throw new Error("Accounts with MFA factors, anonymous status or SSO status require a separately designed recovery workflow.");
    }
    if (typeof user.email_confirm !== "boolean") {
      throw new Error("An account is missing its email confirmation-state flag.");
    }
    if ((user.phone !== null && user.phone !== undefined) || user.phone_confirm === true) {
      throw new Error("Phone-based account data is outside the email/password restore scope.");
    }
    if (!isRecord(user.user_metadata) || !isRecord(user.app_metadata)) {
      throw new Error("An account's user or app metadata is not a JSON object.");
    }
    if (typeof user.aud !== "string" || typeof user.role !== "string") {
      throw new Error("An account is missing its Auth audience or role.");
    }
    const normalizedEmail = user.email.toLowerCase();
    if (ids.has(user.id) || emails.has(normalizedEmail)) throw new Error("The backup contains duplicate account IDs or email addresses.");
    ids.add(user.id);
    emails.add(normalizedEmail);
    if (user.banned_until !== null && user.banned_until !== undefined && !Number.isFinite(Date.parse(user.banned_until))) {
      throw new Error("An account has an invalid ban-expiry timestamp.");
    }
  }
  if (hashAlgorithms.size > 1) {
    throw new Error("The backup mixes password-hash algorithms; restore it only after a dedicated migration plan.");
  }
  return value.users;
}

export function remainingBanDuration(bannedUntil) {
  if (!bannedUntil) return undefined;
  const remainingSeconds = Math.ceil((Date.parse(bannedUntil) - Date.now()) / 1000);
  return remainingSeconds > 0 ? `${remainingSeconds}s` : undefined;
}

export async function readJsonResponse(response) {
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 256 * 1024) {
        await reader.cancel().catch(() => {});
        throw new Error("Auth API response exceeded the 256 KiB safety limit.");
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return chunks.length ? JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))) : null;
  } catch {
    throw new Error("Auth API returned invalid JSON.");
  }
}

async function main() {
  const backupPath = process.argv[2];
  if (!backupPath) throw new Error("Usage: node scripts/restore-auth-users.mjs /path/to/auth-users.json");

  const projectUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const targetProjectRef = process.env.RESTORE_TARGET_PROJECT_REF;
  if (!projectUrl || !serviceKey || !targetProjectRef) {
    throw new Error("Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and RESTORE_TARGET_PROJECT_REF in the trusted shell environment.");
  }
  if (!/^[a-z0-9-]{5,40}$/.test(targetProjectRef)) throw new Error("RESTORE_TARGET_PROJECT_REF is malformed.");

  const url = new URL(projectUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash ||
      url.hostname !== targetProjectRef + ".supabase.co") {
    throw new Error("SUPABASE_URL must be the clean HTTPS origin for RESTORE_TARGET_PROJECT_REF.");
  }
  if (serviceKey.length < 32) throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing or malformed.");

  const backupStat = await lstat(backupPath);
  if (!backupStat.isFile() || backupStat.size > MAX_BACKUP_BYTES) throw new Error("Auth backup must be a regular file no larger than 10 MiB.");
  const bytes = await readFile(backupPath);
  let parsed;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error("Auth backup is not valid UTF-8 JSON.");
  }
  const users = validateBackup(parsed);
  if (parsed.projectRef === targetProjectRef) {
    throw new Error("Refusing to restore Auth accounts back into the source project.");
  }
  if (users.length > 0) {
    const sourceHashAlgorithm = passwordHashAlgorithm(users[0].password_hash);
    if (process.env.RESTORE_PASSWORD_HASH_ALGORITHM !== sourceHashAlgorithm) {
      throw new Error(`Set RESTORE_PASSWORD_HASH_ALGORITHM to ${sourceHashAlgorithm} only after confirming the target Auth project's password hashing algorithm matches the source.`);
    }
  }
  if (users.length === 0) {
    process.stdout.write("The backup contains no active email/password accounts.\n");
    return;
  }

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };
  let restored = 0;
  let alreadyPresent = 0;

  for (const user of users) {
    const endpoint = new URL(`/auth/v1/admin/users/${encodeURIComponent(user.id)}`, url);
    let existingResponse;
    try {
      existingResponse = await fetch(endpoint, { method: "GET", headers, redirect: "error", signal: AbortSignal.timeout(15000) });
    } catch {
      throw new Error("Could not reach the Auth Admin API while checking an account.");
    }

    if (existingResponse.ok) {
      const existing = await readJsonResponse(existingResponse);
      const existingUser = isRecord(existing?.user) ? existing.user : existing;
      if (!isRecord(existingUser) || existingUser.id !== user.id || String(existingUser.email ?? "").toLowerCase() !== user.email.toLowerCase()) {
        throw new Error("An existing Auth account conflicts with an account in the backup.");
      }
      alreadyPresent += 1;
      continue;
    }
    if (existingResponse.status !== 404) {
      await existingResponse.body?.cancel().catch(() => {});
      throw new Error(`Auth Admin API account lookup failed with HTTP ${existingResponse.status}.`);
    }
    await existingResponse.body?.cancel().catch(() => {});

    const payload = {
      id: user.id,
      aud: user.aud,
      role: user.role,
      email: user.email,
      password_hash: user.password_hash,
      email_confirm: user.email_confirm,
      user_metadata: user.user_metadata,
      app_metadata: user.app_metadata,
      ban_duration: remainingBanDuration(user.banned_until),
    };

    let createResponse;
    try {
      createResponse = await fetch(new URL("/auth/v1/admin/users", url), {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        redirect: "error",
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new Error("Could not reach the Auth Admin API while restoring an account.");
    }
    if (!createResponse.ok) {
      await createResponse.body?.cancel().catch(() => {});
      throw new Error(`Auth Admin API account creation failed with HTTP ${createResponse.status}; no response body or account data was logged.`);
    }
    const created = await readJsonResponse(createResponse);
    const createdUser = isRecord(created?.user) ? created.user : created;
    if (!isRecord(createdUser) || createdUser.id !== user.id) {
      throw new Error("Auth Admin API did not confirm the expected restored account UUID.");
    }
    restored += 1;
  }

  process.stdout.write(`Auth restore finished: ${restored} created, ${alreadyPresent} matching accounts already present.\n`);
  process.stdout.write("Sessions and MFA factors were not restored; users must sign in again.\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => fail(error instanceof Error ? error.message : "Unexpected restore error."));
}
