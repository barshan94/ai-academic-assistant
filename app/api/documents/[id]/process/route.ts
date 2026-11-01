import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logSafeOperationalEvent } from "@/lib/observability/safe-log";
import { extractTextFromDrivePdf, getDriveAccessToken } from "@/lib/drive/google";
import { splitExtractedText } from "@/lib/documents/split-extracted-text";
import { isProcessingJobStale } from "@/lib/documents/processing-state";
import { canSafelyReplaceExtractedPages } from "@/lib/documents/reprocessing-safety";

export const runtime = "nodejs";
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

function redirectToDocument(request: NextRequest, id: string, status: string) {
  const url = new URL("/dashboard/documents/" + encodeURIComponent(id), request.url);
  url.searchParams.set("process", status);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  if (origin !== request.nextUrl.origin) return new NextResponse("Forbidden", { status: 403 });

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.redirect(new URL("/login", request.url));

  const { id } = await context.params;
  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id,drive_file_id,status")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (documentError || !document?.drive_file_id) return redirectToDocument(request, id, "not_found");
  if (document.status === "ready") return redirectToDocument(request, id, "already_reviewed");

  const { data: job, error: jobError } = await supabase
    .from("processing_jobs")
    .select("id,status,attempt_count,max_attempts,started_at")
    .eq("document_id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (jobError || !job) return redirectToDocument(request, id, "job_missing");
  if (job.status === "completed") return redirectToDocument(request, id, "already_processed");

  // Replacing page rows can cascade-delete saved questions and can be blocked
  // by immutable chapter-note source references. Refuse reprocessing before
  // claiming a job whenever existing academic content depends on those pages.
  const { data: existingPages, error: existingPagesError } = await supabase
    .from("document_pages")
    .select("id")
    .eq("document_id", id)
    .eq("owner_id", user.id);
  if (existingPagesError) return redirectToDocument(request, id, "reprocess_check_failed");
  const existingPageIds = (existingPages ?? []).map((page) => page.id);
  if (existingPageIds.length) {
    const [{ data: linkedQuestions, error: questionsError }, { data: linkedNotes, error: notesError }] = await Promise.all([
      supabase.from("questions").select("id").eq("owner_id", user.id).in("document_page_id", existingPageIds).limit(1),
      supabase.from("chapter_note_sources").select("id").eq("owner_id", user.id).in("document_page_id", existingPageIds).limit(1),
    ]);
    if (questionsError || notesError) return redirectToDocument(request, id, "reprocess_check_failed");
    if (!canSafelyReplaceExtractedPages({
      questionReferences: linkedQuestions?.length ?? 0,
      chapterNoteReferences: linkedNotes?.length ?? 0,
    })) return redirectToDocument(request, id, "reprocess_blocked");
  }

  if (job.status === "running") {
    if (!isProcessingJobStale(job.started_at)) return redirectToDocument(request, id, "already_processing");
    const { data: recovered, error: recoveryError } = await supabase.rpc("recover_stale_document_processing_job", {
      p_document_id: id,
      p_owner_id: user.id,
      p_job_id: job.id,
      p_expected_started_at: job.started_at,
    });
    if (recoveryError || recovered !== true) return redirectToDocument(request, id, "already_processing");
  }
  if (job.attempt_count >= job.max_attempts) return redirectToDocument(request, id, "retry_limit");

  const expectedStatus = job.status === "running" ? "failed" : job.status;
  const { data: claimed, error: claimError } = await supabase.rpc("claim_document_processing_job", {
    p_document_id: id,
    p_owner_id: user.id,
    p_job_id: job.id,
    p_expected_status: expectedStatus,
    p_expected_attempt_count: job.attempt_count,
    p_expected_started_at: job.started_at,
  });
  if (claimError || claimed !== true) return redirectToDocument(request, id, "already_processing");

  try {
    const accessToken = await getDriveAccessToken();
    const extractedText = await extractTextFromDrivePdf({
      accessToken,
      driveFileId: document.drive_file_id,
    });
    const pages = splitExtractedText(extractedText);

    if (!pages.length) throw new Error("No readable text was detected. The file needs manual review.");
    if (pages.length > 100) throw new Error("The document exceeded the 100-page processing limit.");

    const { data: completedPageCount, error: completionError } = await supabase.rpc("complete_document_processing", {
      p_document_id: id,
      p_owner_id: user.id,
      p_job_id: job.id,
      p_pages: pages,
    });
    if (completionError || completedPageCount !== pages.length) {
      throw new Error("Could not atomically complete document page replacement and the processing job.");
    }

    return redirectToDocument(request, id, "complete");
  } catch {
    // Persist only a stable, owner-safe status message. Provider and database
    // exceptions can contain upstream details or sensitive document metadata.
    logSafeOperationalEvent("document_processing_failed", { route: "/api/documents/[id]/process", errorCode: "DOCUMENT_PROCESSING_FAILED" });
    const { data: failurePersisted, error: failureError } = await supabase.rpc("fail_document_processing", {
      p_document_id: id,
      p_owner_id: user.id,
      p_job_id: job.id,
      p_error_code: "DOCUMENT_PROCESSING_FAILED",
    });
    if (failureError || failurePersisted !== true) {
      return redirectToDocument(request, id, "failure_state_unpersisted");
    }
    return redirectToDocument(request, id, "processing_failed");
  }
}
