import { spawnSync, execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const scriptPath = fileURLToPath(new URL("../scripts/reconcile-nonprod-supabase-migrations.sh", import.meta.url));
const script = readFileSync(scriptPath, "utf8");
const workflowPath = fileURLToPath(new URL("../.github/workflows/reconcile-nonprod-migrations.yml", import.meta.url));
const workflow = readFileSync(workflowPath, "utf8");

describe("retired Supabase migration reconciliation", () => {
  it("has valid Bash syntax on Unix-like runners", () => {
    if (process.platform === "win32") return;
    expect(() => execFileSync("bash", ["-n", scriptPath])).not.toThrow();
  });

  it("fails closed without requiring or reading credentials", () => {
    if (process.platform === "win32") return;
    const result = spawnSync("bash", [scriptPath], {
      encoding: "utf8",
      env: { PATH: process.env.PATH ?? "" },
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Migration reconciliation is disabled");
    expect(result.stdout).toBe("");
  });

  it("contains no Supabase CLI invocation or hosted mutation command", () => {
    expect(script).not.toMatch(/\bsupabase\s+(link|migration|db|projects)\b/i);
    expect(script).not.toContain("SUPABASE_ACCESS_TOKEN");
    expect(script).not.toContain("SUPABASE_DB_PASSWORD");
    expect(script).not.toContain("migration repair");
    expect(script).not.toContain("db push");
    expect(script).not.toContain("db reset");
  });

  it("keeps the retired workflow manual-only and free of credentials or checkout", () => {
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).not.toContain("  push:");
    expect(workflow).not.toContain("  pull_request:");
    expect(workflow).not.toContain("  schedule:");
    expect(workflow).not.toContain("actions/checkout");
    expect(workflow).not.toContain("supabase/setup-cli");
    expect(workflow).not.toContain("SUPABASE_ACCESS_TOKEN");
    expect(workflow).not.toContain("SUPABASE_DB_PASSWORD");
    expect(workflow).not.toContain("secrets.");
  });

  it("makes a manual dispatch stop before any repository or hosted-resource access", () => {
    expect(workflow).toContain("Stop before repository or hosted-resource access");
    expect(workflow).toContain("Migration reconciliation is disabled");
    expect(workflow).toContain("exit 1");
    expect(workflow).not.toContain("migration repair");
    expect(workflow).not.toContain("db push");
  });
});
