import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deleteDriveFile, getDriveAccessToken, uploadPdfToDrive } from "@/lib/drive/google";

export const runtime = "nodejs";
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

function redirectWithStatus(request: NextRequest, status: string) {
  const url = new URL("/dashboard/documents", request.url);
  url.searchParams.set("upload", status);
  return NextResponse.redirect(url, 303);
}

function safeFileName(value: string) {
  return value.replace(/[\\/\\0-\\x1f]/g, "_").trim().slice(0, 180) || "academic-document";
}

async function normalizeToPdf(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error("Choose a file smaller than 20 MB.");
  }

  if (file.type === "application/pdf" && Buffer.from(bytes).subarray(0, 5).toString() === "%PDF-") {
    return { bytes, fileName: safeFileName(file.name.toLowerCase().endsWith(".pdf") ? file.name : `${file.name}.pdf`) };
  }

  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = Buffer.from(bytes).subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (!isJpeg && !isPng) throw new Error("Only valid PDF, JPEG and PNG files are supported.");

  const pdf = await PDFDocument.create();
  const image = isJpeg ? await pdf.embedJpg(bytes) : await pdf.embedPng(bytes);
  const page = pdf.addPage([image.width, image.height]);
  page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  const output = await pdf.save();
  const baseName = file.name.replace(/\\.[^.]+$/, "");
  return { bytes: new Uint8Array(output), fileName: safeFileName(`${baseName}.pdf`) };
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.redirect(new URL("/login", request.url));

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return redirectWithStatus(request, "missing_file");

    const normalized = await normalizeToPdf(file);
    const sha256 = createHash("sha256").update(normalized.bytes).digest("hex");

    const { data: duplicate } = await supabase
      .from("documents")
      .select("id")
      .eq("owner_id", user.id)
      .eq("sha256", sha256)
      .maybeSingle();
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
