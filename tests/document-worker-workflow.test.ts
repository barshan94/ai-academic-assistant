import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const workflowPath = fileURLToPath(new URL("../.github/workflows/document-worker.yml", import.meta.url));
const workflow = readFileSync(workflowPath, "utf8");
const runnerPath = fileURLToPath(new URL("../scripts/invoke-document-worker.mjs", import.meta.url));
const runner = readFileSync(runnerPath, "utf8");

describe("document worker workflow safety", () => {
  it("can only be invoked manually, never by a push, PR, or schedule", () => {
    expect(workflow.split("\n").slice(2, 5)).toEqual([
      "on:",
      "  workflow_dispatch:",
      "    inputs:",
    ]);
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
    expect(workflow).toContain("inputs.confirm_nonprod_worker_run == true");
    expect(workflow).toContain("github.event_name == 'workflow_dispatch'");
  });

  it("checks out the selected revision and pins Node before invoking the script", () => {
    const checkoutIndex = workflow.indexOf("uses: actions/checkout@");
    const nodeSetupIndex = workflow.indexOf("uses: actions/setup-node@");
    const validationIndex = workflow.indexOf("- name: Validate worker configuration");
    const invocationIndex = workflow.indexOf("node scripts/invoke-document-worker.mjs");

    expect(checkoutIndex).toBeGreaterThan(-1);
    expect(nodeSetupIndex).toBeGreaterThan(checkoutIndex);
    expect(validationIndex).toBeGreaterThan(nodeSetupIndex);
    expect(invocationIndex).toBeGreaterThan(validationIndex);
    expect(workflow).toContain("persist-credentials: false");
    expect(workflow).toContain("uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1");
    expect(workflow).toContain("uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0");
    expect(workflow).toContain("node-version: 22");
  });

  it("pins the secret destination to the known non-production Preview origin", () => {
    expect(workflow).toContain(
      'https://ai-academic-assistant-git-feature-m3-ai-solver-barshan-s-team.vercel.app',
    );
    expect(workflow).toContain('[ "${#CRON_SECRET}" -ge 32 ]');
    expect(runner).toContain("APPROVED_PREVIEW_ORIGIN");
    expect(runner).toContain('redirect: "error"');
    expect(runner).toContain("AbortSignal.timeout(timeoutMs)");
    expect(workflow).not.toContain("inputs.app_base_url");
  });

  it("sends only a single POST to the document-processing endpoint", () => {
    expect(runner).toContain('method: "POST"');
    expect(runner).toContain('new URL("/api/cron/process-documents", appBaseUrl)');
    expect(workflow).toContain("node scripts/invoke-document-worker.mjs");
    expect(workflow).not.toContain("while true");
    expect(workflow).not.toContain("sleep ");
  });

  it("bounds the response and never prints raw worker or upstream error text", () => {
    expect(runner).toContain("MAX_RESPONSE_BYTES = 16 * 1024");
    expect(runner).toContain("response exceeded");
    expect(runner).toContain('new TextDecoder("utf-8", { fatal: true })');
    expect(workflow).not.toContain("response_file");
    expect(runner).not.toContain("console.log(JSON.stringify");
    expect(runner).not.toContain("console.error(error)");
  });
});
