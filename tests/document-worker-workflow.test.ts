import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const workflowPath = fileURLToPath(new URL("../.github/workflows/document-worker.yml", import.meta.url));
const workflow = readFileSync(workflowPath, "utf8");

describe("document worker workflow safety", () => {
  it("can only be invoked manually, never by a push, PR, or schedule", () => {
    expect(workflow).toMatch(/^on:\s*\n  workflow_dispatch:\s*\n    inputs:/m);
    expect(workflow).not.toMatch(/^  (?:push|pull_request|schedule|repository_dispatch):/m);
  });

  it("requires an explicit boolean confirmation that defaults to false", () => {
    expect(workflow).toContain("confirm_nonprod_worker_run:");
    expect(workflow).toContain("required: true");
    expect(workflow).toContain("type: boolean");
    expect(workflow).toContain("default: false");
    expect(workflow).toContain("inputs.confirm_nonprod_worker_run == true");
  });

  it("restricts the credentialed job to the existing feature branch", () => {
    expect(workflow).toContain("github.ref == 'refs/heads/feature/m3-ai-solver'");
    expect(workflow).toContain("github.event_name == 'workflow_dispatch'");
  });

  it("pins the secret destination to the known non-production Preview origin", () => {
    expect(workflow).toContain(
      'https://ai-academic-assistant-git-feature-m3-ai-solver-barshan-s-team.vercel.app',
    );
    expect(workflow).toContain('[ "${#CRON_SECRET}" -ge 32 ]');
    expect(workflow).toContain('--proto "=https"');
    expect(workflow).not.toContain("inputs.app_base_url");
  });

  it("sends only a single POST to the document-processing endpoint", () => {
    expect(workflow).toContain("--request POST");
    expect(workflow).toContain("/api/cron/process-documents");
    expect(workflow).toContain("name: Process at most one non-production document");
    expect(workflow).not.toContain("while true");
    expect(workflow).not.toContain("sleep ");
  });

  it("never prints the raw worker response or upstream error text", () => {
    expect(workflow).toContain("Never print the raw response");
    expect(workflow).toContain("inspect the protected job state");
    expect(workflow).not.toMatch(/(?:cat|echo)\s+["']?\$response_file/);
    expect(workflow).not.toContain('jq . "$response_file"');
  });
});
