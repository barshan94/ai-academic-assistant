import { describe, expect, it } from "vitest";
import { createPersistedWorkerFailureResponse } from "./worker-response";

describe("persisted document worker failure response", () => {
  it("returns a failing HTTP status after persistence so the scheduler can alert", async () => {
    const response = createPersistedWorkerFailureResponse("job-123");
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      processed: false,
      job_id: "job-123",
      failed: true,
      error: "Document processing failed. Reconnect Google Drive if the problem persists.",
    });
  });

  it("never includes upstream exception text in the response", async () => {
    const response = createPersistedWorkerFailureResponse("job-456");
    const body = await response.text();
    expect(body).not.toContain("invalid_grant");
    expect(body).not.toContain("refresh_token");
    expect(body).not.toContain("provider response body");
  });
});
