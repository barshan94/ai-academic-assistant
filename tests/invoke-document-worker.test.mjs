import { describe, expect, it, vi } from "vitest";
import {
  APPROVED_PREVIEW_ORIGIN,
  MAX_RESPONSE_BYTES,
  invokeWorker,
  parseWorkerPayload,
  readBoundedBody,
} from "../scripts/invoke-document-worker.mjs";

const cronSecret = "s".repeat(32);
const baseUrl = APPROVED_PREVIEW_ORIGIN;
const jobId = "00000000-0000-4000-8000-000000000001";

function jsonResponse(payload, status = 200, contentType = "application/json") {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": contentType },
  });
}

describe("bounded document worker invocation", () => {
  it("sends one authenticated POST to the exact approved Preview without following redirects", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ processed: true, page_count: 7, job_id: jobId }),
    );

    await expect(invokeWorker({ appBaseUrl: baseUrl, cronSecret, fetchImpl })).resolves.toEqual({
      processed: true,
      jobId,
      pageCount: 7,
    });

    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, options] = fetchImpl.mock.calls[0];
    expect(String(url)).toBe(`${baseUrl}/api/cron/process-documents`);
    expect(options).toMatchObject({
      method: "POST",
      headers: { Authorization: `Bearer ${cronSecret}`, Accept: "application/json" },
      cache: "no-store",
      redirect: "error",
    });
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it("rejects any destination other than the exact Preview before sending credentials", async () => {
    const fetchImpl = vi.fn();
    await expect(
      invokeWorker({ appBaseUrl: "https://example.invalid", cronSecret, fetchImpl }),
    ).rejects.toThrow("APP_BASE_URL must equal");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects a missing or short worker secret before sending a request", async () => {
    const fetchImpl = vi.fn();
    await expect(
      invokeWorker({ appBaseUrl: baseUrl, cronSecret: "short", fetchImpl }),
    ).rejects.toThrow("CRON_SECRET is missing or too short");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("accepts only the documented empty-queue outcomes with no extra fields", () => {
    expect(parseWorkerPayload(JSON.stringify({ processed: false, reason: "queue_empty" }))).toEqual({
      processed: false,
    });
    expect(parseWorkerPayload(JSON.stringify({ processed: false, reason: "no_claimable_job" }))).toEqual({
      processed: false,
    });
    expect(() =>
      parseWorkerPayload(JSON.stringify({ processed: false, reason: "queue_empty", error: "unexpected" })),
    ).toThrow("did not complete");
    expect(() =>
      parseWorkerPayload(JSON.stringify({ processed: false, reason: "database_error" })),
    ).toThrow("did not complete");
  });

  it("requires a UUID job identifier and an exact completion response shape", () => {
    expect(parseWorkerPayload(JSON.stringify({
      processed: true,
      job_id: jobId,
      page_count: 7,
    }))).toEqual({ processed: true, jobId, pageCount: 7 });

    for (const payload of [
      { processed: true, page_count: 7 },
      { processed: true, job_id: "not-a-uuid", page_count: 7 },
      { processed: true, job_id: jobId, page_count: 7, document_id: "unexpected" },
    ]) {
      expect(() => parseWorkerPayload(JSON.stringify(payload))).toThrow("invalid completion record");
    }
  });

  it("rejects malformed JSON and invalid page counts", () => {
    expect(() => parseWorkerPayload("{")).toThrow("invalid JSON");
    expect(() => parseWorkerPayload(JSON.stringify({
      processed: true,
      job_id: jobId,
      page_count: 0,
    }))).toThrow("invalid page count");
    expect(() => parseWorkerPayload(JSON.stringify({
      processed: true,
      job_id: jobId,
      page_count: 101,
    }))).toThrow("invalid page count");
  });

  it("rejects successful HTTP responses that are not explicitly JSON", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ processed: false, reason: "queue_empty" }, 200, "text/plain"),
    );
    await expect(invokeWorker({ appBaseUrl: baseUrl, cronSecret, fetchImpl })).rejects.toThrow(
      "unexpected content type",
    );
  });

  it("rejects response bodies larger than 16 KiB while streaming", async () => {
    const response = new Response("x".repeat(MAX_RESPONSE_BYTES + 1));
    await expect(readBoundedBody(response)).rejects.toThrow("response exceeded");
  });

  it("rejects invalid UTF-8 rather than parsing replacement characters", async () => {
    const response = new Response(Uint8Array.from([0xff, 0xfe]));
    await expect(readBoundedBody(response)).rejects.toThrow("invalid UTF-8");
  });

  it("does not expose upstream response bodies on non-success HTTP status", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ error: "refresh_token=private-upstream-detail" }, 500),
    );
    let caught;
    try {
      await invokeWorker({ appBaseUrl: baseUrl, cronSecret, fetchImpl });
    } catch (error) {
      caught = error;
    }
    expect(caught?.message).toBe("Document worker returned HTTP 500.");
    expect(caught?.message).not.toContain("refresh_token");
  });

  it("does not expose fetch exception text or credentials", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error(`private failure ${cronSecret}`));
    await expect(invokeWorker({ appBaseUrl: baseUrl, cronSecret, fetchImpl })).rejects.toThrow(
      "request failed or a redirect was rejected",
    );
  });
});
