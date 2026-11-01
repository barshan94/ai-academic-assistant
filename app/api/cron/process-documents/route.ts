import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { decryptRefreshToken } from "@/lib/drive/crypto";
import { extractTextFromDrivePdf, readGoogleJsonResponseBounded } from "@/lib/drive/google";
import { splitExtractedText } from "@/lib/documents/split-extracted-text";
import { canSafelyReplaceExtractedPages } from "@/lib/documents/reprocessing-safety";
import { isBackgroundJobClaimable, isBackgroundJobRetryEligible } from "@/lib/documents/worker-policy";
import { logSafeOperationalEvent } from "@/lib/observability/safe-log";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !supplied) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(supplied);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function refreshDriveAccessToken(encryptedToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google Drive OAuth environment is not configured.");
  const refreshToken = decryptRefreshToken(encryptedToken);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await readGoogleJsonResponseBounded<{ access_token?: string; error?: string; error_description?: string }>(response, 64 * 1024, "Google OAuth token response");
  if (!response.ok || !payload.access_token) {
    // Never persist or return Google-provided error text: upstream responses
    // may echo credentials, document metadata or other sensitive context.
    throw new Error("DRIVE_TOKEN_REFRESH_FAILED");
  }
  return payload.access_token;
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: "Worker database credentials are not configured." }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // One job per invocation keeps runtime bounded. The conditional UPDATE is
  // the claim operation: concurrent cron invocations cannot both own a job.
  const staleBefore = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data: candidates, error: candidateError } = await supabase
    .from("processing_jobs")
    .select("id,owner_id,document_id,attempt_count,max_attempts,status,started_at")
    .or(`status.eq.queued,status.eq.failed,and(status.eq.running,started_at.lt.${staleBefore}),and(status.eq.running,started_at.is.null)`)
    .order("created_at", { ascending: true })
    .limit(10);

  if (candidateError) return Response.json({ error: "Could not read the processing queue." }, { status: 500 });
  if (!candidates?.length) return Response.json({ processed: false, reason: "queue_empty" });

  for (const candidate of candidates) {
    if (!isBackgroundJobRetryEligible(candidate.attempt_count, candidate.max_attempts)) continue;
    if (!isBackgroundJobClaimable({ status: candidate.status, startedAt: candidate.started_at })) continue;
    let claim = supabase.from("processing_jobs").update({
      status: "running",
      stage: "ocr",
      progress: 10,
      attempt_count: candidate.attempt_count + 1,
      started_at: new Date().toISOString(),
      error_code: null,
      error_message: null,
    }).eq("id", candidate.id)
      .eq("owner_id", candidate.owner_id)
      .eq("status", candidate.status)
      .eq("attempt_count", candidate.attempt_count);

    if (candidate.started_at) claim = claim.eq("started_at", candidate.started_at);
    else claim = claim.is("started_at", null);

    const { data: claimed, error: claimError } = await claim.select("id").maybeSingle();
    if (claimError || !claimed) continue;

    const jobId = candidate.id;
    const ownerId = candidate.owner_id;
    const documentId = candidate.document_id;

    try {
      const [{ data: document, error: documentError }, { data: connection, error: connectionError }] = await Promise.all([
        supabase.from("documents").select("id,drive_file_id,status").eq("id", documentId).eq("owner_id", ownerId).maybeSingle(),
        supabase.from("drive_connections").select("encrypted_refresh_token").eq("owner_id", ownerId).maybeSingle(),
      ]);
      if (documentError || !document?.drive_file_id) throw new Error("The source document or its Drive file is unavailable.");
      if (connectionError || !connection?.encrypted_refresh_token) throw new Error("The owner must reconnect Google Drive.");

      const { data: existingPages, error: pagesError } = await supabase
        .from("document_pages").select("id").eq("document_id", documentId).eq("owner_id", ownerId);
      if (pagesError) throw new Error("Could not verify existing document page references.");

      const pageIds = (existingPages ?? []).map((page) => page.id);
      if (pageIds.length) {
        const [{ data: linkedQuestions, error: questionError }, { data: linkedNotes, error: noteError }] = await Promise.all([
          supabase.from("questions").select("id").eq("owner_id", ownerId).in("document_page_id", pageIds).limit(1),
          supabase.from("chapter_note_sources").select("id").eq("owner_id", ownerId).in("document_page_id", pageIds).limit(1),
        ]);
        if (questionError || noteError) throw new Error("Could not verify whether saved academic records reference these pages.");
        if (!canSafelyReplaceExtractedPages({
          questionReferences: linkedQuestions?.length ?? 0,
          chapterNoteReferences: linkedNotes?.length ?? 0,
        })) throw new Error("Reprocessing was blocked to protect saved questions or chapter notes.");
      }

      const { data: processingDocument, error: processingDocumentError } = await supabase
        .from("documents").update({ status: "processing" })
        .eq("id", documentId).eq("owner_id", ownerId)
        .select("id").maybeSingle();
      if (processingDocumentError || !processingDocument) {
        throw new Error("Could not mark the source document as processing.");
      }
      const accessToken = await refreshDriveAccessToken(connection.encrypted_refresh_token);
      const extractedText = await extractTextFromDrivePdf({ accessToken, driveFileId: document.drive_file_id });
      const pages = splitExtractedText(extractedText);
      if (!pages.length) throw new Error("No readable text was detected. The file needs manual review.");
      if (pages.length > 100) throw new Error("The document exceeded the 100-page processing limit.");

      const { data: completedPageCount, error: completionError } = await supabase.rpc("complete_document_processing", {
        p_document_id: documentId,
        p_owner_id: ownerId,
        p_job_id: jobId,
        p_pages: pages,
      });
      if (completionError || completedPageCount !== pages.length) {
        throw new Error("Could not atomically complete document page replacement and the processing job.");
      }
      return Response.json({ processed: true, job_id: jobId, page_count: pages.length });
    } catch {
      // Keep provider/database exception text out of persistent job rows and
      // HTTP responses. Detailed diagnostics belong in a separately reviewed,
      // redacted observability channel, not owner-visible job metadata.
      const message = "Document processing failed. Reconnect Google Drive if the problem persists.";
      logSafeOperationalEvent("document_worker_failed", { route: "/api/cron/process-documents", errorCode: "BACKGROUND_PROCESSING_FAILED", jobId });
      const [{ data: failedDocument, error: failedDocumentError }, { data: failedJob, error: failedJobError }] = await Promise.all([
        supabase.from("documents").update({ status: "failed" })
          .eq("id", documentId).eq("owner_id", ownerId).select("id").maybeSingle(),
        supabase.from("processing_jobs").update({
          status: "failed",
          error_code: "BACKGROUND_PROCESSING_FAILED",
          error_message: message.slice(0, 500),
        }).eq("id", jobId).eq("owner_id", ownerId).eq("status", "running").select("id").maybeSingle(),
      ]);
      if (failedDocumentError || !failedDocument || failedJobError || !failedJob) {
        // Leave the lease in place if failure state cannot be persisted. The
        // stale-job policy can safely reclaim it after the lease expires.
        return Response.json({
          processed: false,
          job_id: jobId,
          error: "Processing failed and its failure state could not be persisted.",
        }, { status: 500 });
      }
      return Response.json({ processed: true, job_id: jobId, failed: true, error: message });
    }
  }

  return Response.json({ processed: false, reason: "no_claimable_job" });
}
