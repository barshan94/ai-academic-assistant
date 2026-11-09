import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const routePath = fileURLToPath(new URL("../app/api/cron/process-documents/route.ts", import.meta.url));
const workflowPath = fileURLToPath(new URL("../.github/workflows/document-worker.yml", import.meta.url));
const monitorPath = fileURLToPath(new URL("../.github/workflows/health-monitor.yml", import.meta.url));
const route = readFileSync(routePath, "utf8");
const workflow = readFileSync(workflowPath, "utf8");
const monitor = readFileSync(monitorPath, "utf8");
const approvedPreviewOrigin = "https://ai-academic-assistant-git-feature-m3-ai-solver-barshan-s-team.vercel.app";

describe("document worker HTTP method", () => {
  it("exposes queue processing only as POST because it mutates processing state", () => {
    expect(route).toContain("export async function POST(request: Request)");
    expect(route).not.toContain("export async function GET(request: Request)");
  });

  it("invokes the protected worker with POST and validates a sanitized response", () => {
    expect(workflow).toContain("--request POST");
    expect(workflow).toContain('--proto "=https" --tlsv1.2 --connect-timeout 10');
    expect(workflow).toContain('floor == .');
    expect(workflow).not.toContain("--request GET");
    expect(workflow).toContain('--header "Authorization: Bearer $CRON_SECRET"');
    expect(workflow).toContain("CRON_SECRET must contain at least 32 characters");
    expect(workflow).not.toContain("--retry");
    expect(workflow).toContain('response_file="$(mktemp)"');
    expect(workflow).toContain('--output "$response_file"');
    expect(workflow).toContain("jq -e");
    expect(workflow).not.toContain("--output /dev/null");
    expect(workflow).not.toContain('cat "$response_file"');
  });

  it("restricts credentialed dispatch to the feature branch and this project's Preview origin", () => {
    expect(workflow).toContain("if: github.ref == 'refs/heads/feature/m3-ai-solver'");
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
    expect(workflow).toMatch(/^on:\s*\n  workflow_dispatch:\s*$/m);
    expect(workflow).not.toMatch(/^\s{2}(?:schedule|push|pull_request|repository_dispatch):/m);
  });
});
