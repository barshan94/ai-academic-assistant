import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { decryptRefreshToken } from "@/lib/drive/crypto";
import { extractTextFromDrivePdf } from "@/lib/drive/google";
import { splitExtractedText } from "@/lib/documents/split-extracted-text";
import { canSafelyReplaceExtractedPages } from "@/lib/documents/reprocessing-safety";
import { isBackgroundJobClaimable, isBackgroundJobRetryEligible } from "@/lib/documents/worker-policy";

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
  });
  const payload = await response.json() as { access_token?: string; error?: string; error_description?: string };
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || "Google Drive token refresh failed.");
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

      await supabase.from("documents").update({ status: "processing" }).eq("id", documentId).eq("owner_id", ownerId);
      const accessToken = await refreshDriveAccessToken(connection.encrypted_refresh_token);
      const extractedText = await extractTextFromDrivePdf({ accessToken, driveFileId: document.drive_file_id });
      const pages = splitExtractedText(extractedText);
      if (!pages.length) throw new Error("No readable text was detected. The file needs manual review.");
      if (pages.length > 100) throw new Error("The document exceeded the 100-page processing limit.");

      if (pageIds.length) {
        const { error: deleteError } = await supabase.from("document_pages").delete()
          .eq("document_id", documentId).eq("owner_id", ownerId);
        if (deleteError) throw new Error("Could not safely replace the previous extracted pages.");
      }

      const pageRows = pages.map((text, index) => ({
        owner_id: ownerId,
        document_id: documentId,
        page_number: index + 1,
        extracted_text: text,
        extraction_method: "ocr",
        status: "review_required",
      }));
      const { error: insertError } = await supabase.from("document_pages").insert(pageRows);
      if (insertError) throw new Error("Could not save extracted document text.");

      await supabase.from("documents").update({ status: "review_required", page_count: pages.length })
        .eq("id", documentId).eq("owner_id", ownerId);
      await supabase.from("processing_jobs").update({
        status: "completed", stage: "ocr", progress: 100, completed_at: new Date().toISOString(),
        error_code: null, error_message: null,
      }).eq("id", jobId).eq("owner_id", ownerId);
      return Response.json({ processed: true, job_id: jobId, page_count: pages.length });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Document processing failed.";
      await supabase.from("documents").update({ status: "failed" }).eq("id", documentId).eq("owner_id", ownerId);
      await supabase.from("processing_jobs").update({
        status: "failed",
        error_code: "BACKGROUND_PROCESSING_FAILED",
        error_message: message.slice(0, 500),
      }).eq("id", jobId).eq("owner_id", ownerId);
      return Response.json({ processed: true, job_id: jobId, failed: true, error: message.slice(0, 300) });
    }
  }

  return Response.json({ processed: false, reason: "no_claimable_job" });
}
