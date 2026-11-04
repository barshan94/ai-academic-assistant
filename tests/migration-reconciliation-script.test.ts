import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const scriptPath = fileURLToPath(new URL("../scripts/reconcile-nonprod-supabase-migrations.sh", import.meta.url));
const script = readFileSync(scriptPath, "utf8");
const workflowPath = fileURLToPath(new URL("../.github/workflows/reconcile-nonprod-migrations.yml", import.meta.url));
const workflow = readFileSync(workflowPath, "utf8");

describe("non-production Supabase migration reconciliation script", () => {
  it("has valid Bash syntax on Unix-like runners", () => {
    if (process.platform === "win32") return;
    expect(() => execFileSync("bash", ["-n", scriptPath])).not.toThrow();
  });

  it("pins the approved target and CLI version", () => {
    expect(script).toContain('EXPECTED_PROJECT_REF="uqpyzicftxxegajaocxi"');
    expect(script).toContain('EXPECTED_CLI_VERSION="2.122.0"');
  });

  it("passes credentials through environment variables, never command-line arguments", () => {
    expect(script).toContain("export SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD");
    expect(script).toContain('supabase link --project-ref "$EXPECTED_PROJECT_REF"');
    expect(script).not.toContain('--password "$SUPABASE_DB_PASSWORD"');
    expect(script).toContain("set +x");
    expect(script.match(/^set \+x$/gm)).toHaveLength(1);
    expect(script.match(/^export SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD$/gm)).toHaveLength(1);
  });

  it("requires a dry run and explicit APPLY confirmation before applying pending DDL", () => {
    const dryRun = script.indexOf("supabase db push --linked --include-all --dry-run");
    const prompt = script.indexOf('read -r -p "Type APPLY to continue: " confirmation');
    const apply = script.indexOf("supabase db push --linked --include-all --yes");
    expect(dryRun).toBeGreaterThan(-1);
    expect(prompt).toBeGreaterThan(dryRun);
    expect(apply).toBeGreaterThan(prompt);
    expect(script).toContain('if [[ "$confirmation" != "APPLY" ]]');
  });

  it("repairs only the three currently verified SQL-equivalent history pairs", () => {
    expect(script).toContain("20261103162903 20261104124726 20261104125214");
    expect(script).toContain("20261103163000 20261104100000 20261104110000");
    expect(script).not.toContain("20261031031132");
    expect(script).not.toContain("20261031031233");
  });

  it("does not reset the database or accept an arbitrary project reference", () => {
    expect(script).not.toContain("supabase db reset");
    expect(script).not.toContain("supabase projects create");
    expect(script).not.toContain('SUPABASE_PROJECT_ID:-');
  });
  it("keeps the hosted migration runner manual, branch-restricted and pinned", () => {
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).not.toContain("  push:");
    expect(workflow).not.toContain("  pull_request:");
    expect(workflow).toContain("refs/heads/feature/m3-ai-solver");
    expect(workflow).toContain("version: 2.122.0");
    expect(workflow).toContain("supabase/setup-cli@a9de0f0e1ffcf6ec895b135e292ddc76592d3c83");
    expect(workflow).toContain("default: reconcile-and-dry-run");
    expect(workflow).toContain("APPLY uqpyzicftxxegajaocxi");
    expect(workflow).toContain("${{ secrets.SUPABASE_ACCESS_TOKEN }}");
    expect(workflow).toContain("${{ secrets.SUPABASE_DB_PASSWORD }}");
  });

});
