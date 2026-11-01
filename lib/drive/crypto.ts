import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const MAX_ENCRYPTED_VALUE_BYTES = 16 * 1024;

function decodeCanonicalBase64(value: string, expectedBytes: number) {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error("DRIVE_TOKEN_ENCRYPTION_KEY must use canonical base64 encoding.");
  }
  const decoded = Buffer.from(value, "base64");
  if (decoded.length !== expectedBytes || decoded.toString("base64") !== value) {
    throw new Error("DRIVE_TOKEN_ENCRYPTION_KEY must be a canonical base64-encoded 32-byte key.");
  }
  return decoded;
}

function decodeCanonicalBase64Url(value: string, expectedBytes?: number) {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error("Stored encrypted Drive value has invalid base64url data.");
  }
  const decoded = Buffer.from(value, "base64url");
  if (decoded.toString("base64url") !== value || (expectedBytes !== undefined && decoded.length !== expectedBytes)) {
    throw new Error("Stored encrypted Drive value has invalid encoded lengths.");
  }
  return decoded;
}

function getEncryptionKey() {
  const encoded = process.env.DRIVE_TOKEN_ENCRYPTION_KEY;
  if (!encoded) throw new Error("DRIVE_TOKEN_ENCRYPTION_KEY is not configured.");
  return decodeCanonicalBase64(encoded, 32);
}

function encryptValue(value: string) {
  if (typeof value !== "string" || !value || Buffer.byteLength(value, "utf8") > MAX_ENCRYPTED_VALUE_BYTES) {
    throw new Error("Drive secret value is empty or exceeds the storage limit.");
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

function decryptValue(value: string) {
  if (typeof value !== "string" || value.length > MAX_ENCRYPTED_VALUE_BYTES * 2) {
    throw new Error("Stored encrypted Drive value is invalid or too large.");
  }
  const parts = value.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Stored encrypted Drive value has an unsupported format.");
  }
  const iv = decodeCanonicalBase64Url(parts[1], 12);
  const tag = decodeCanonicalBase64Url(parts[2], 16);
  const encrypted = decodeCanonicalBase64Url(parts[3]);
  if (!encrypted.length || encrypted.length > MAX_ENCRYPTED_VALUE_BYTES) {
    throw new Error("Stored encrypted Drive value has an invalid ciphertext length.");
  }
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}

export function encryptRefreshToken(token: string) {
  return encryptValue(token);
}

export function decryptRefreshToken(value: string) {
  return decryptValue(value);
}

export function encryptDriveUploadSession(value: string) {
  return encryptValue(value);
}

export function decryptDriveUploadSession(value: string) {
  return decryptValue(value);
}
