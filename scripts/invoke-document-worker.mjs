import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const APPROVED_PREVIEW_ORIGIN =
  "https://ai-academic-assistant-git-feature-m3-ai-solver-barshan-s-team.vercel.app";
export const MAX_RESPONSE_BYTES = 16 * 1024;
export const REQUEST_TIMEOUT_MS = 65_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function hasExactKeys(value, expectedKeys) {
  const actualKeys = Object.keys(value);
  return actualKeys.length === expectedKeys.length &&
    expectedKeys.every((key) => Object.hasOwn(value, key));
}

export function validateWorkerConfiguration(appBaseUrl, cronSecret) {
  if (appBaseUrl !== APPROVED_PREVIEW_ORIGIN) {
    throw new Error("APP_BASE_URL must equal the approved non-production Preview origin.");
  }
  if (typeof cronSecret !== "string" || cronSecret.length < 32) {
    throw new Error("CRON_SECRET is missing or too short.");
  }
  return new URL("/api/cron/process-documents", appBaseUrl);
}

export async function readBoundedBody(response, maxBytes = MAX_RESPONSE_BYTES) {
  if (!response.body) {
    throw new Error("Document worker returned an empty response body.");
  }

  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  try {
    while (true) {
      let result;
      try {
        result = await reader.read();
      } catch {
        throw new Error("Document worker response could not be read safely.");
      }
      if (result.done) break;

      totalBytes += result.value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new Error(`Document worker response exceeded ${maxBytes} bytes.`);
      }
      chunks.push(Buffer.from(result.value));
    }
  } finally {
    reader.releaseLock();
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
  } catch {
    throw new Error("Document worker returned invalid UTF-8.");
  }
}

export function parseWorkerPayload(raw) {
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new Error("Document worker returned invalid JSON.");
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
      typeof payload.processed !== "boolean") {
    throw new Error("Document worker returned an unsupported response.");
  }

  if (payload.processed) {
    if (!hasExactKeys(payload, ["processed", "job_id", "page_count"]) ||
        typeof payload.job_id !== "string" || !UUID_PATTERN.test(payload.job_id)) {
      throw new Error("Document worker returned an invalid completion record.");
    }
    if (!Number.isInteger(payload.page_count) || payload.page_count < 1 || payload.page_count > 100) {
      throw new Error("Document worker returned an invalid page count.");
    }
    return { processed: true, jobId: payload.job_id, pageCount: payload.page_count };
  }

  if (hasExactKeys(payload, ["processed", "reason"]) &&
      (payload.reason === "queue_empty" || payload.reason === "no_claimable_job")) {
    return { processed: false };
  }
  if (hasExactKeys(payload, ["processed", "reason"]) &&
      (payload.reason === "stale_job_terminalized" || payload.reason === "stale_job_rechecked")) {
    return { processed: false, maintenance: payload.reason };
  }
  throw new Error("Document worker did not complete a document.");
}

export async function invokeWorker({
  appBaseUrl,
  cronSecret,
  fetchImpl = fetch,
  timeoutMs = REQUEST_TIMEOUT_MS,
}) {
  const url = validateWorkerConfiguration(appBaseUrl, cronSecret);
  let response;

  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        Accept: "application/json",
      },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new Error("Document worker request failed or a redirect was rejected.");
  }

  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error(`Document worker returned HTTP ${response.status}.`);
  }

  const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    await response.body?.cancel().catch(() => undefined);
    throw new Error("Document worker returned an unexpected content type.");
  }

  return parseWorkerPayload(await readBoundedBody(response));
}

async function main() {
  const result = await invokeWorker({
    appBaseUrl: process.env.APP_BASE_URL,
    cronSecret: process.env.CRON_SECRET,
  });

  if (result.processed) {
    console.log(`Worker completed one document; extracted pages: ${result.pageCount}.`);
  } else if (result.maintenance === "stale_job_terminalized") {
    console.log("Worker terminalized one exhausted stale job; no document was processed.");
  } else if (result.maintenance === "stale_job_rechecked") {
    console.log("Worker rechecked one stale lease; no document was processed.");
  } else {
    console.log("Worker endpoint healthy; no claimable document was available.");
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : "Unexpected worker invocation failure.";
    console.error(`::error::${message}`);
    process.exitCode = 1;
  });
}
