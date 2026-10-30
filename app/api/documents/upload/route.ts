import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deleteDriveFile, getDriveAccessToken, uploadPdfToDrive } from "@/lib/drive/google";
import { normalizeToPdf } from "@/lib/documents/normalize-to-pdf";

export const runtime = "nodejs";

function redirectWithStatus(request: NextRequest, status: string) {
  const url = new URL("/dashboard/documents", request.url);
  url.searchParams.set("upload", status);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return new NextResponse("Forbidden", { status: 403 });

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.redirect(new URL("/login", request.url));

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return redirectWithStatus(request, "missing_file");

    const normalized = await normalizeToPdf(file);
    const sha256 = createHash("sha256").update(normalized.bytes).digest("hex");

    const { data: duplicate, error: duplicateError } = await supabase
      .from("documents")
      .select("id")
      .eq("owner_id", user.id)
      .eq("sha256", sha256)
      .maybeSingle();
    if (duplicateError) return redirectWithStatus(request, "failed");
    if (duplicate) return redirectWithStatus(request, "duplicate");

    const accessToken = await getDriveAccessToken();
    const driveFile = await uploadPdfToDrive({
      accessToken,
      fileName: normalized.fileName,
      bytes: normalized.bytes,
    });

    const { data: document, error: insertError } = await supabase
      .from("documents")
      .insert({
        owner_id: user.id,
        file_name: normalized.fileName,
        mime_type: "application/pdf",
        file_size_bytes: normalized.bytes.byteLength,
        sha256,
        drive_file_id: driveFile.id,
        drive_web_view_link: driveFile.webViewLink,
        status: "queued",
      })
      .select("id")
      .single();

    if (insertError || !document) {
      await deleteDriveFile(accessToken, driveFile.id);
      return redirectWithStatus(request, "save_failed");
    }

    const { error: jobError } = await supabase.from("processing_jobs").insert({
      owner_id: user.id,
      document_id: document.id,
      stage: "validate",
      status: "queued",
      idempotency_key: `${user.id}:${sha256}:validate`,
    });

    if (jobError) {
      await supabase.from("documents").delete().eq("id", document.id).eq("owner_id", user.id);
      await deleteDriveFile(accessToken, driveFile.id);
      return redirectWithStatus(request, "queue_failed");
    }

    return redirectWithStatus(request, "success");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    const code = message.includes("Connect Google Drive") ? "drive_not_connected"
      : message.includes("environment variables") || message.includes("not configured") ? "not_configured"
      : "failed";
    return redirectWithStatus(request, code);
  }
}
