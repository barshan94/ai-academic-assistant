import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const routePath = fileURLToPath(new URL("../app/api/cron/process-documents/route.ts", import.meta.url));
const workflowPath = fileURLToPath(new URL("../.github/workflows/document-worker.yml", import.meta.url));
const runnerPath = fileURLToPath(new URL("../scripts/invoke-document-worker.mjs", import.meta.url));
const monitorPath = fileURLToPath(new URL("../.github/workflows/health-monitor.yml", import.meta.url));
const route = readFileSync(routePath, "utf8");
const workflow = readFileSync(workflowPath, "utf8");
const runner = readFileSync(runnerPath, "utf8");
const monitor = readFileSync(monitorPath, "utf8");
const approvedPreviewOrigin = "https://ai-academic-assistant-git-feature-m3-ai-solver-barshan-s-team.vercel.app";

describe("document worker HTTP method", () => {
  it("exposes queue processing only as POST because it mutates processing state", () => {
    expect(route).toContain("export async function POST(request: Request)");
    expect(route).not.toContain("export async function GET(request: Request)");
  });

  it("invokes the protected worker with POST and validates a bounded sanitized response", () => {
    expect(workflow).toContain("node scripts/invoke-document-worker.mjs");
    expect(runner).toContain('method: "POST"');
    expect(runner).toContain('new URL("/api/cron/process-documents", appBaseUrl)');
    expect(runner).toContain('Authorization: `Bearer ${cronSecret}`');
    expect(runner).toContain('redirect: "error"');
    expect(runner).toContain("MAX_RESPONSE_BYTES = 16 * 1024");
    expect(runner).toContain("Number.isInteger(payload.page_count)");
    expect(runner).toContain("response.status");
    expect(runner).not.toContain("console.log(JSON.stringify");
    expect(runner).not.toContain("console.error(error)");
    expect(workflow).not.toContain("--retry");
    expect(workflow).not.toContain("response_file");
  });

  it("restricts credentialed dispatch to the feature branch and this project's Preview origin", () => {
    expect(workflow).toContain("github.event_name == 'workflow_dispatch'");
    expect(workflow).toContain("github.ref == 'refs/heads/feature/m3-ai-solver'");
    expect(workflow).toContain("inputs.confirm_nonprod_worker_run == true");
    expect(workflow).toContain(`if [[ "$APP_BASE_URL" != "${approvedPreviewOrigin}" ]]`);
    expect(workflow).not.toContain("ai-academic-assistant-[a-z0-9-]+-barshan-s-team");
    expect(workflow).toContain("APP_BASE_URL must equal the verified feature-branch Preview origin");
  });

  it("pins readiness-monitor credentials to the same verified feature Preview origin", () => {
    expect(monitor).toContain(`const approvedPreviewOrigin = "${approvedPreviewOrigin}"`);
    expect(monitor).toContain("raw !== approvedPreviewOrigin");
    expect(monitor).toContain("url.origin !== approvedPreviewOrigin");
    expect(monitor).toContain('redirect: "error"');
    expect(monitor).toContain('Authorization: `Bearer ${process.env.CRON_SECRET}`');
    expect(monitor).toContain('new URL("/api/health/ready", process.env.APP_BASE_URL)');
    expect(monitor).not.toContain("/api/cron/process-documents");
    expect(monitor).not.toContain("--request POST");
    expect(monitor).not.toContain('url.protocol !== "https:" || !url.hostname');
  });

  it("keeps queue processing opt-in with no recurring or automatic trigger", () => {
    expect(workflow).toMatch(/^on:\s*\n  workflow_dispatch:\s*\n    inputs:/m);
    expect(workflow).not.toMatch(/^\s{2}(?:schedule|push|pull_request|repository_dispatch):/m);
  });
});
