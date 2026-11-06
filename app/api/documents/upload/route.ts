import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deleteDriveFile, getDriveAccessToken, uploadPdfToDrive } from "@/lib/drive/google";
import { normalizeFilesToPdf } from "@/lib/documents/normalize-to-pdf";

export const runtime = "nodejs";

function redirectWithStatus(request: NextRequest, status: string) {
  const url = new URL("/dashboard/documents", request.url);
  url.searchParams.set("upload", status);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin !== request.nextUrl.origin) return new NextResponse("Forbidden", { status: 403 });

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.redirect(new URL("/login", request.url));

  let uploadedDriveFileId: string | null = null;
  let accessToken: string | null = null;

  try {
    const form = await request.formData();
    const files = form.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
    if (!files.length) return redirectWithStatus(request, "missing_file");

    const normalized = await normalizeFilesToPdf(files);
    const sha256 = createHash("sha256").update(normalized.bytes).digest("hex");

    accessToken = await getDriveAccessToken();
    const driveFile = await uploadPdfToDrive({
      accessToken,
      fileName: normalized.fileName,
      bytes: normalized.bytes,
    });
    uploadedDriveFileId = driveFile.id;

    // One owner-checked database RPC creates the document and its queue job,
    // enforces the upload quota, and serializes duplicate detection.
    const { data, error } = await supabase.rpc("register_uploaded_document", {
      p_owner_id: user.id,
      p_file_name: normalized.fileName,
      p_file_size_bytes: normalized.bytes.byteLength,
      p_sha256: sha256,
      p_drive_file_id: driveFile.id,
      p_drive_web_view_link: driveFile.webViewLink,
      p_page_count: normalized.pageCount,
    });

    if (error) {
      await deleteDriveFile(accessToken, driveFile.id);
      uploadedDriveFileId = null;
      return redirectWithStatus(request, error.message.toLowerCase().includes("quota") ? "quota" : "save_failed");
    }

    const registration = Array.isArray(data) ? data[0] : data;
    if (!registration?.document_id) {
      await deleteDriveFile(accessToken, driveFile.id);
      uploadedDriveFileId = null;
      return redirectWithStatus(request, "save_failed");
    }

    if (registration.duplicate) {
      // Keep the previously archived file; remove only this redundant upload.
      if (registration.stored_drive_file_id !== driveFile.id) {
        await deleteDriveFile(accessToken, driveFile.id);
      }
      uploadedDriveFileId = null;
      return redirectWithStatus(request, "duplicate");
    }

    uploadedDriveFileId = null;
    return redirectWithStatus(request, "success");
  } catch (error) {
    if (accessToken && uploadedDriveFileId) {
      try { await deleteDriveFile(accessToken, uploadedDriveFileId); } catch { /* orphan cleanup can be retried manually */ }
    }
    const message = error instanceof Error ? error.message : "Upload failed.";
    const code = message.includes("Connect Google Drive") ? "drive_not_connected"
      : message.includes("environment variables") || message.includes("not configured") ? "not_configured"
      : "failed";
    return redirectWithStatus(request, code);
  }
}
