import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { extractTextFromDrivePdf, getDriveAccessToken } from "@/lib/drive/google";
import { splitExtractedText } from "@/lib/documents/split-extracted-text";

export const runtime = "nodejs";

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
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return redirectToDocument(request, id, "not_found");
  }

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id,drive_file_id,status")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

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

  if (job.status === "running" && job.attempt_count >= job.max_attempts) {
    const { data: recovered } = await supabase.rpc("recover_stale_document_processing_job", {
      p_document_id: id,
      p_owner_id: user.id,
      p_job_id: job.id,
      p_expected_started_at: job.started_at,
    });
    return redirectToDocument(request, id, recovered ? "retry_limit" : "already_processing");
  }

  if (job.attempt_count >= job.max_attempts) return redirectToDocument(request, id, "retry_limit");
  if (!["queued", "failed", "running"].includes(job.status)) return redirectToDocument(request, id, "not_processable");

  const { data: claimed, error: claimError } = await supabase.rpc("claim_document_processing_job", {
    p_document_id: id,
    p_owner_id: user.id,
    p_job_id: job.id,
    p_expected_status: job.status,
    p_expected_attempt_count: job.attempt_count,
    p_expected_started_at: job.started_at,
  });
  if (claimError || !claimed) return redirectToDocument(request, id, "already_processing");

  try {
    const accessToken = await getDriveAccessToken();
    const extractedText = await extractTextFromDrivePdf({
      accessToken,
      driveFileId: document.drive_file_id,
    });
    const pages = splitExtractedText(extractedText);

    if (!pages.length) throw new Error("No readable text was detected. The file needs manual review.");
    if (pages.length > 100) throw new Error("The document exceeded the 100-page processing limit.");

    // Page replacement, document review state and job completion commit atomically.
    const { error: completeError } = await supabase.rpc("complete_document_processing", {
      p_document_id: id,
      p_owner_id: user.id,
      p_job_id: job.id,
      p_pages: pages,
    });
    if (completeError) throw new Error("The extracted pages could not be committed safely.");

    return redirectToDocument(request, id, "complete");
  } catch {
    // Keep failure transitions atomic and avoid storing provider/OAuth error details.
    const { error: failError } = await supabase.rpc("fail_document_processing", {
      p_document_id: id,
      p_owner_id: user.id,
      p_job_id: job.id,
      p_error_code: "DOCUMENT_PROCESSING_FAILED",
    });
    return redirectToDocument(request, id, failError ? "processing_state_error" : "processing_failed");
  }
}
