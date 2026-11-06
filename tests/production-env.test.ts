import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const script = resolve(process.cwd(), "scripts/validate-production-env.mjs");
const validEnvironment: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "fixture-publishable-key",
  SUPABASE_SERVICE_ROLE_KEY: "fixture-service-role-key",
  GOOGLE_DRIVE_REDIRECT_URI: "https://fixture.example.com/api/drive/callback",
  GOOGLE_CLIENT_ID: "fixture-client-id",
  GOOGLE_CLIENT_SECRET: "fixture-client-secret",
  CRON_SECRET: "x".repeat(48),
  DRIVE_TOKEN_ENCRYPTION_KEY: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
  AI_ENABLED: "true",
  AI_API_KEY: "fixture-ai-key",
  AI_MODEL: "fixture-model",
  AI_API_BASE_URL: "https://api.openai.com/v1",
};

function run(overrides: Record<string, string | undefined> = {}) {
  const env = { ...process.env, ...validEnvironment };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete env[key];
    else env[key] = value;
  }
  return spawnSync(process.execPath, [script], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
}

describe("production environment preflight", () => {
  it("accepts a complete synthetic configuration without printing secret values", () => {
    const result = run();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("preflight passed");
    expect(result.stdout + result.stderr).not.toContain("fixture-service-role-key");
    expect(result.stdout + result.stderr).not.toContain("fixture-client-secret");
    expect(result.stdout + result.stderr).not.toContain(validEnvironment.CRON_SECRET);
  });

  it("fails when each required integration credential is absent", () => {
    const required = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "GOOGLE_DRIVE_REDIRECT_URI",
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
      "CRON_SECRET",
      "DRIVE_TOKEN_ENCRYPTION_KEY",
    ];
    for (const key of required) {
      const result = run({ [key]: undefined });
      expect(result.status, key).toBe(1);
      expect(result.stderr, key).toContain(key);
    }
  });

  it.each([
    ["Supabase URL", { NEXT_PUBLIC_SUPABASE_URL: "http://fixture.supabase.co" }],
    ["Supabase URL path", { NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.co/project" }],
    ["OAuth callback path", { GOOGLE_DRIVE_REDIRECT_URI: "https://fixture.example.com/wrong-path" }],
    ["OAuth callback HTTP", { GOOGLE_DRIVE_REDIRECT_URI: "http://fixture.example.com/api/drive/callback" }],
    ["OAuth callback credentials", { GOOGLE_DRIVE_REDIRECT_URI: "https://user:pass@fixture.example.com/api/drive/callback" }],
    ["short cron secret", { CRON_SECRET: "too-short" }],
    ["non-canonical encryption key", { DRIVE_TOKEN_ENCRYPTION_KEY: "not-base64" }],
    ["wrong encryption key length", { DRIVE_TOKEN_ENCRYPTION_KEY: Buffer.alloc(16).toString("base64") }],
    ["insecure AI endpoint", { AI_API_BASE_URL: "http://provider.example/v1" }],
    ["invalid fallback flag", { AI_ALLOW_PROVIDER_FALLBACKS: "yes" }],
    ["invalid AI enable flag", { AI_ENABLED: "sometimes" }],
  ])("rejects invalid %s", (_label, overrides) => {
    const result = run(overrides);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("preflight failed");
  });

  it("accepts a zero-cost deployment with AI disabled even if provider credentials are absent", () => {
    const result = run({
      AI_ENABLED: "false",
      AI_API_KEY: undefined,
      AI_MODEL: undefined,
      AI_PROVIDER_POOL: undefined,
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("preflight passed");
    expect(result.stderr).toContain("AI_ENABLED is not true");
  });

  it.each([
    ["key without model", { AI_API_KEY: "fixture-ai-key", AI_MODEL: undefined }],
    ["model without key", { AI_API_KEY: undefined, AI_MODEL: "fixture-model" }],
  ])("rejects a partial optional AI configuration: %s", (_label, overrides) => {
    const result = run(overrides);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("preflight failed");
  });

  it("rejects AI opt-in when no provider credentials are configured", () => {
    const result = run({ AI_ENABLED: "true", AI_API_KEY: undefined, AI_MODEL: undefined, AI_PROVIDER_POOL: undefined });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("AI_API_KEY is required");
  });

  it("accepts an explicitly task-complete provider pool", () => {
    const pool = [
      { name: "answer", baseUrl: "https://answer.example/v1", apiKey: "answer-key", model: "answer-model", tasks: ["answer"] },
      { name: "notes", baseUrl: "https://notes.example/v1", apiKey: "notes-key", model: "notes-model", tasks: ["chapter-note"] },
    ];
    const result = run({ AI_PROVIDER_POOL: JSON.stringify(pool), AI_API_KEY: undefined, AI_MODEL: undefined });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("preflight passed");
  });

  it("rejects a provider pool that leaves a task without an enabled provider", () => {
    const pool = [
      { name: "answer", baseUrl: "https://answer.example/v1", apiKey: "answer-key", model: "answer-model", tasks: ["answer"] },
      { name: "disabled-notes", baseUrl: "https://notes.example/v1", apiKey: "notes-key", model: "notes-model", tasks: ["chapter-note"], enabled: false },
    ];
    const result = run({ AI_PROVIDER_POOL: JSON.stringify(pool), AI_API_KEY: undefined, AI_MODEL: undefined });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("chapter-note");
  });

  it("rejects malformed provider pools and provider URLs", () => {
    expect(run({ AI_PROVIDER_POOL: "{broken", AI_API_KEY: undefined, AI_MODEL: undefined }).status).toBe(1);
    const pool = [{
      name: "insecure",
      baseUrl: "http://provider.example/v1",
      apiKey: "provider-key",
      model: "provider-model",
      tasks: ["answer", "chapter-note"],
    }];
    expect(run({ AI_PROVIDER_POOL: JSON.stringify(pool), AI_API_KEY: undefined, AI_MODEL: undefined }).status).toBe(1);
  });
});
