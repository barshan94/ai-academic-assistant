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

  it("invokes the protected worker with POST from the scheduled workflow", () => {
    expect(workflow).toContain("--request POST");
    expect(workflow).not.toContain("--request GET");
    expect(workflow).toContain("--header \"Authorization: Bearer $CRON_SECRET\"");
    expect(workflow).not.toContain("--retry");
  });
});
