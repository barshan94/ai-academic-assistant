#!/usr/bin/env node
import process from "node:process";

const failures = [];
const warnings = [];

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) failures.push(name + " is required.");
  return value ?? "";
}

function secureOriginUrl(name, raw, expectedPath = "/") {
  if (!raw) return false;
  try {
    const url = new URL(raw);
    const valid = url.protocol === "https:" &&
      Boolean(url.hostname) &&
      !url.username && !url.password &&
      !url.search && !url.hash &&
      url.pathname === expectedPath;
    if (!valid) failures.push(name + " must be an HTTPS URL with no credentials, query or fragment and path " + expectedPath + ".");
    return valid;
  } catch {
    failures.push(name + " must be a valid HTTPS URL.");
    return false;
  }
}

function validProviderUrl(name, raw) {
  if (typeof raw !== "string" || raw.length > 500) {
    failures.push(name + " must be a URL no longer than 500 characters.");
    return false;
  }
  try {
    const url = new URL(raw.replace(/\/+$/, ""));
    const valid = url.protocol === "https:" && Boolean(url.hostname) &&
      !url.username && !url.password && !url.search && !url.hash;
    if (!valid) failures.push(name + " must use HTTPS and cannot contain credentials, query or fragment.");
    return valid;
  } catch {
    failures.push(name + " must be a valid URL.");
    return false;
  }
}

function validateAIProviders() {
  const rawPool = process.env.AI_PROVIDER_POOL?.trim();
  const tasks = new Set();
  if (rawPool) {
    if (rawPool.length > 20_000) {
      failures.push("AI_PROVIDER_POOL exceeds 20,000 characters.");
      return;
    }
    let providers;
    try {
      providers = JSON.parse(rawPool);
    } catch {
      failures.push("AI_PROVIDER_POOL must contain valid JSON.");
      return;
    }
    if (!Array.isArray(providers) || providers.length < 1 || providers.length > 8) {
      failures.push("AI_PROVIDER_POOL must contain between 1 and 8 providers.");
      return;
    }
    providers.forEach((provider, index) => {
      const prefix = "AI_PROVIDER_POOL[" + index + "]";
      if (!provider || typeof provider !== "object" || Array.isArray(provider)) {
        failures.push(prefix + " must be an object.");
        return;
      }
      if (typeof provider.name !== "string" || !provider.name.trim() || provider.name.length > 60) failures.push(prefix + ".name is invalid.");
      if (typeof provider.apiKey !== "string" || !provider.apiKey.trim() || provider.apiKey.length > 1000) failures.push(prefix + ".apiKey is required.");
      if (typeof provider.model !== "string" || !provider.model.trim() || provider.model.length > 160) failures.push(prefix + ".model is invalid.");
      validProviderUrl(prefix + ".baseUrl", provider.baseUrl);
      if (!Array.isArray(provider.tasks) || provider.tasks.length < 1 ||
          provider.tasks.some((task) => task !== "answer" && task !== "chapter-note")) {
        failures.push(prefix + ".tasks must contain answer and/or chapter-note.");
      } else if (provider.enabled !== false) {
        provider.tasks.forEach((task) => tasks.add(task));
      }
      if (provider.priority !== undefined &&
          (!Number.isInteger(provider.priority) || provider.priority < 0 || provider.priority > 1000)) {
        failures.push(prefix + ".priority must be an integer from 0 to 1000.");
      }
      if (provider.enabled !== undefined && typeof provider.enabled !== "boolean") failures.push(prefix + ".enabled must be boolean.");
    });
  } else {
    const apiKey = required("AI_API_KEY");
    const model = required("AI_MODEL");
    if (apiKey.length > 1000) failures.push("AI_API_KEY must not exceed 1,000 characters.");
    if (model.length > 160) failures.push("AI_MODEL must not exceed 160 characters.");
    const providerName = process.env.AI_PROVIDER_NAME?.trim() || "openai-compatible";
    if (providerName.length > 60) failures.push("AI_PROVIDER_NAME must not exceed 60 characters.");
    validProviderUrl("AI_API_BASE_URL", process.env.AI_API_BASE_URL?.trim() || "https://api.openai.com/v1");
    tasks.add("answer");
    tasks.add("chapter-note");
  }
  for (const task of ["answer", "chapter-note"]) {
    if (!tasks.has(task)) failures.push("At least one enabled AI provider must support " + task + ".");
  }
  const fallbacks = process.env.AI_ALLOW_PROVIDER_FALLBACKS;
  if (fallbacks !== undefined && fallbacks !== "true" && fallbacks !== "false") {
    failures.push("AI_ALLOW_PROVIDER_FALLBACKS must be exactly true or false.");
  }
}

required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
secureOriginUrl("NEXT_PUBLIC_SUPABASE_URL", required("NEXT_PUBLIC_SUPABASE_URL"));
required("SUPABASE_SERVICE_ROLE_KEY");
secureOriginUrl("GOOGLE_DRIVE_REDIRECT_URI", required("GOOGLE_DRIVE_REDIRECT_URI"), "/api/drive/callback");
required("GOOGLE_CLIENT_ID");
required("GOOGLE_CLIENT_SECRET");

const cronSecret = required("CRON_SECRET");
if (cronSecret.length < 32) failures.push("CRON_SECRET must contain at least 32 characters.");

const encodedDriveKey = required("DRIVE_TOKEN_ENCRYPTION_KEY");
if (!/^[A-Za-z0-9+/]{43}=$/.test(encodedDriveKey)) {
  failures.push("DRIVE_TOKEN_ENCRYPTION_KEY must be canonical Base64 for exactly 32 bytes.");
} else {
  const decoded = Buffer.from(encodedDriveKey, "base64");
  if (decoded.length !== 32 || decoded.toString("base64") !== encodedDriveKey) {
    failures.push("DRIVE_TOKEN_ENCRYPTION_KEY must be canonical Base64 for exactly 32 bytes.");
  }
}

validateAIProviders();

if (process.env.WEB_SEARCH_PROVIDER === "brave" && !process.env.BRAVE_SEARCH_API_KEY?.trim()) {
  warnings.push("WEB_SEARCH_PROVIDER is brave but BRAVE_SEARCH_API_KEY is empty; web research will be unavailable.");
}
if (process.env.AI_ALLOW_PROVIDER_FALLBACKS === "true") {
  warnings.push("AI provider fallbacks are enabled and may create additional provider charges.");
}

for (const warning of warnings) process.stderr.write("WARNING: " + warning + "\n");
if (failures.length) {
  process.stderr.write("Production environment preflight failed (" + failures.length + " issue(s)):\n");
  for (const failure of failures) process.stderr.write("- " + failure + "\n");
  process.exitCode = 1;
} else {
  process.stdout.write("Production environment preflight passed. Secret values were not displayed.\n");
}
