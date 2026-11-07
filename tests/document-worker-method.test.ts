import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const routePath = fileURLToPath(new URL("../app/api/cron/process-documents/route.ts", import.meta.url));
const workflowPath = fileURLToPath(new URL("../.github/workflows/document-worker.yml", import.meta.url));
const route = readFileSync(routePath, "utf8");
const workflow = readFileSync(workflowPath, "utf8");

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
    expect(workflow).toContain("ai-academic-assistant-[a-z0-9-]+-barshan-s-team\\.vercel\\.app");
    expect(workflow).toContain("APP_BASE_URL must be this project's Vercel Preview origin");
  });

  it("keeps queue processing opt-in with no recurring or automatic trigger", () => {
    expect(workflow).toMatch(/^on:\s*\n  workflow_dispatch:\s*$/m);
    expect(workflow).not.toMatch(/^\s{2}(?:schedule|push|pull_request|repository_dispatch):/m);
  });
});
