import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { extractTextFromDrivePdf, getDriveAccessToken } from "@/lib/drive/google";
import { splitExtractedText } from "@/lib/documents/split-extracted-text";
import { isProcessingJobStale } from "@/lib/documents/processing-state";

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
  if (job.status === "running") {
    if (!isProcessingJobStale(job.started_at)) return redirectToDocument(request, id, "already_processing");
    let recoveryQuery = supabase.from("processing_jobs").update({
      status: "failed",
      error_code: "STALE_PROCESSING_RECOVERED",
      error_message: "A previous processing attempt stopped responding and was marked recoverable.",
    }).eq("id", job.id).eq("owner_id", user.id).eq("status", "running");
    recoveryQuery = job.started_at
      ? recoveryQuery.eq("started_at", job.started_at)
      : recoveryQuery.is("started_at", null);
    const { data: recoveredJob, error: recoveryError } = await recoveryQuery.select("id").maybeSingle();
    if (recoveryError || !recoveredJob) return redirectToDocument(request, id, "already_processing");
    await supabase.from("documents").update({ status: "failed" }).eq("id", id).eq("owner_id", user.id);
  }
  if (job.attempt_count >= job.max_attempts) return redirectToDocument(request, id, "retry_limit");

  const { data: claimedJob, error: claimError } = await supabase.from("processing_jobs").update({
    status: "running",
    stage: "ocr",
    progress: 10,
    attempt_count: job.attempt_count + 1,
    started_at: new Date().toISOString(),
    error_code: null,
    error_message: null,
  }).eq("id", job.id).eq("owner_id", user.id).in("status", ["queued", "failed"]).select("id").maybeSingle();
  if (claimError || !claimedJob) return redirectToDocument(request, id, "already_processing");

  await supabase.from("documents").update({ status: "processing" }).eq("id", id).eq("owner_id", user.id);

  try {
    const accessToken = await getDriveAccessToken();
    const extractedText = await extractTextFromDrivePdf({
      accessToken,
      driveFileId: document.drive_file_id,
    });
    const pages = splitExtractedText(extractedText);

    if (!pages.length) throw new Error("No readable text was detected. The file needs manual review.");
    if (pages.length > 100) throw new Error("The document exceeded the 100-page processing limit.");

    const { error: deleteError } = await supabase
      .from("document_pages")
      .delete()
      .eq("document_id", id)
      .eq("owner_id", user.id);
    if (deleteError) throw new Error("Could not prepare the document pages for reprocessing.");

    const pageRows = pages.map((text, index) => ({
      owner_id: user.id,
      document_id: id,
      page_number: index + 1,
      extracted_text: text,
      extraction_method: "ocr",
      status: "review_required",
    }));
    const { error: insertError } = await supabase.from("document_pages").insert(pageRows);
    if (insertError) throw new Error("Could not save extracted document text.");

    await supabase.from("documents").update({
      status: "review_required",
      page_count: pages.length,
    }).eq("id", id).eq("owner_id", user.id);

    await supabase.from("processing_jobs").update({
      status: "completed",
      stage: "ocr",
      progress: 100,
      completed_at: new Date().toISOString(),
      error_code: null,
      error_message: null,
    }).eq("id", job.id).eq("owner_id", user.id);

    return redirectToDocument(request, id, "complete");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Document processing failed.";
    await supabase.from("documents").update({ status: "failed" }).eq("id", id).eq("owner_id", user.id);
    await supabase.from("processing_jobs").update({
      status: "failed",
      error_code: "DOCUMENT_PROCESSING_FAILED",
      error_message: message.slice(0, 500),
    }).eq("id", job.id).eq("owner_id", user.id);
    return redirectToDocument(request, id, "processing_failed");
  }
}
