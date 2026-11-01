import { describe, expect, it } from "vitest";
import { createPersistedWorkerFailureResponse } from "@/lib/documents/worker-response";

describe("persisted document worker failure response", () => {
  it("returns HTTP 500 so scheduled invocations are marked failed", async () => {
    const response = createPersistedWorkerFailureResponse("job-123");
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      processed: false,
      job_id: "job-123",
      failed: true,
      error: "Document processing failed. Reconnect Google Drive if the problem persists.",
    });
  });

  it("does not expose upstream diagnostics or document content", async () => {
    const response = createPersistedWorkerFailureResponse("job-456");
    const body = await response.text();
    expect(body).not.toContain("GOOGLE_CLIENT_SECRET");
    expect(body).not.toContain("access_token");
    expect(body).not.toContain("stack");
    expect(body).not.toContain("provider response");
    expect(body).not.toContain("document text");
  });
});
