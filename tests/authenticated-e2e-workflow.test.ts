import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const workflowPath = fileURLToPath(new URL("../.github/workflows/authenticated-e2e.yml", import.meta.url));
const workflow = readFileSync(workflowPath, "utf8");

describe("authenticated E2E workflow safety", () => {
  it("does not mutate the hosted test project on push, pull request, or a schedule", () => {
    expect(workflow).toMatch(/^on:\s*\n  workflow_dispatch:\s*\n    inputs:/m);
    expect(workflow).not.toMatch(/^  (?:push|pull_request|schedule|repository_dispatch):/m);
  });

  it("requires an explicit boolean confirmation before running hosted fixtures", () => {
    expect(workflow).toContain("confirm_nonprod_mutation:");
    expect(workflow).toContain("required: true");
    expect(workflow).toContain("type: boolean");
    expect(workflow).toContain("default: false");
    expect(workflow).toContain("inputs.confirm_nonprod_mutation == true");
  });

  it("restricts manual execution to the existing feature branch", () => {
    expect(workflow).toContain("github.event_name == 'workflow_dispatch'");
    expect(workflow).toContain("github.ref == 'refs/heads/feature/m3-ai-solver'");
  });

  it("keeps the hosted test target pinned to the approved non-production project", () => {
    expect(workflow).toContain('https://uqpyzicftxxegajaocxi.supabase.co');
    expect(workflow).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});
