import { afterEach, describe, expect, it, vi } from "vitest";
import { logSafeOperationalEvent } from "@/lib/observability/safe-log";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("safe operational logging", () => {
  it("emits only allow-listed, validated metadata", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    logSafeOperationalEvent("document_worker_failed", {
      route: "/api/cron/process-documents",
      errorCode: "BACKGROUND_PROCESSING_FAILED",
      jobId: "not-a-uuid private-owner-and-document",
      durationMs: -1,
      provider: "google drive token=secret",
    });

    expect(error).toHaveBeenCalledOnce();
    const serialized = String(error.mock.calls[0][0]);
    const event = JSON.parse(serialized) as Record<string, unknown>;

    expect(event).toMatchObject({
      event: "document_worker_failed",
      route: "/api/cron/process-documents",
      errorCode: "BACKGROUND_PROCESSING_FAILED",
    });
    expect(event.jobId).toBeUndefined();
    expect(event.durationMs).toBeUndefined();
    expect(event.provider).toBeUndefined();
    expect(serialized).not.toContain("private-owner");
    expect(serialized).not.toContain("secret");
  });

  it("keeps exhausted quota events as warnings rather than server errors", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    logSafeOperationalEvent("ai_generation_quota_exhausted", {
      route: "/api/answers",
      errorCode: "QUOTA_EXHAUSTED",
      durationMs: 125,
      provider: "openai",
    });

    expect(warn).toHaveBeenCalledOnce();
    expect(error).not.toHaveBeenCalled();
    const event = JSON.parse(String(warn.mock.calls[0][0])) as Record<string, unknown>;
    expect(event).toMatchObject({
      event: "ai_generation_quota_exhausted",
      route: "/api/answers",
      errorCode: "QUOTA_EXHAUSTED",
      durationMs: 125,
      provider: "openai",
    });
  });
});
