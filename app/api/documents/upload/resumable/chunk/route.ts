import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logSafeOperationalEvent } from "@/lib/observability/safe-log";
import { decryptDriveUploadSession } from "@/lib/drive/crypto";
import { getDriveAccessToken, sendResumablePdfChunk, deleteDriveFile } from "@/lib/drive/google";
import { isValidDriveChunk, parseDriveUploadOffset, readDriveUploadChunk } from "@/lib/drive/resumable-upload";
import { MAX_UPLOAD_BYTES, safeFileName } from "@/lib/documents/upload-limits";

export const runtime = "nodejs";
export const maxDuration = 60;

type UploadSession = {
  ownerId: string;
  sessionUri: string;
  fileName: string;
  fileSizeBytes: number;
  sha256: string;
  pageCount: number | null;
  expiresAt: number;
};

async function saveCompletedUpload(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  session: UploadSession,
  file: { id?: string; webViewLink?: string; mimeType?: string; size?: string },
) {
  if (!file.id) throw new Error("Google Drive completed the upload without returning a file ID.");
  if (file.mimeType !== "application/pdf" || Number(file.size) !== session.fileSizeBytes) {
    const accessToken = await getDriveAccessToken();
    await deleteDriveFile(accessToken, file.id);
    throw new Error("Google Drive returned a file with an unexpected type or size. The incomplete archive was removed.");
  }

  const { data: existing, error: existingError } = await supabase.from("documents")
    .select("id,drive_file_id").eq("owner_id", session.ownerId).eq("sha256", session.sha256).maybeSingle();
  if (existingError) throw new Error("Could not verify whether this document was already archived.");
  if (existing) {
    if (existing.drive_file_id !== file.id) {
      const accessToken = await getDriveAccessToken();
      await deleteDriveFile(accessToken, file.id);
    }
    return { documentId: existing.id, duplicate: true };
  }

  const { data: document, error: documentError } = await supabase.from("documents").insert({
    owner_id: session.ownerId,
    file_name: session.fileName,
    mime_type: "application/pdf",
    file_size_bytes: session.fileSizeBytes,
    sha256: session.sha256,
    drive_file_id: file.id,
    drive_web_view_link: file.webViewLink ?? null,
    page_count: session.pageCount,
    status: "queued",
  }).select("id").single();

  if (documentError || !document) {
    const accessToken = await getDriveAccessToken();
    await deleteDriveFile(accessToken, file.id);
    throw new Error("The uploaded file could not be registered in the document library.");
  }

  const { error: jobError } = await supabase.from("processing_jobs").insert({
    owner_id: session.ownerId,
    document_id: document.id,
    stage: "validate",
    status: "queued",
    idempotency_key: session.ownerId + ":" + session.sha256 + ":validate",
  });

  if (jobError) {
    await supabase.from("documents").delete().eq("id", document.id).eq("owner_id", session.ownerId);
    const accessToken = await getDriveAccessToken();
    await deleteDriveFile(accessToken, file.id);
    throw new Error("The processing job could not be queued. The uploaded file was rolled back.");
  }

  return { documentId: document.id, duplicate: false };
}

function isValidUploadSession(value: unknown): value is UploadSession {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const session = value as Partial<UploadSession>;
  if (
    typeof session.ownerId !== "string" || !session.ownerId ||
    typeof session.fileName !== "string" || safeFileName(session.fileName) !== session.fileName ||
    !session.fileName.toLowerCase().endsWith(".pdf") ||
    !Number.isSafeInteger(session.fileSizeBytes) || (session.fileSizeBytes ?? 0) < 1 ||
    (session.fileSizeBytes ?? 0) > MAX_UPLOAD_BYTES ||
    typeof session.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(session.sha256) ||
    !(session.pageCount === null || (Number.isInteger(session.pageCount) && session.pageCount >= 1 && session.pageCount <= 50)) ||
    !Number.isSafeInteger(session.expiresAt) || (session.expiresAt ?? 0) <= Date.now() ||
    typeof session.sessionUri !== "string"
  ) return false;

  try {
    const uri = new URL(session.sessionUri);
    return uri.protocol === "https:" && uri.hostname === "www.googleapis.com" &&
      /^\\/upload\\/drive\\/v3\\/files(?:\\/|$)/.test(uri.pathname);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to continue this upload." }, { status: 401 });

  const encryptedSession = request.headers.get("x-upload-session");
  if (!encryptedSession) return NextResponse.json({ error: "Upload session is missing." }, { status: 400 });

  let session: UploadSession;
  try {
    const decoded: unknown = JSON.parse(decryptDriveUploadSession(encryptedSession));\n    if (!isValidUploadSession(decoded)) throw new Error("Invalid upload session payload.");\n    session = decoded;
  } catch {
    return NextResponse.json({ error: "Upload session is invalid or expired." }, { status: 400 });
  }

  if (session.ownerId !== user.id) return NextResponse.json({ error: "This upload belongs to another account." }, { status: 403 });
  if (!Number.isSafeInteger(session.fileSizeBytes) || session.fileSizeBytes < 1 ||
      session.fileSizeBytes > MAX_UPLOAD_BYTES || session.expiresAt < Date.now()) {
    return NextResponse.json({ error: "Upload session has expired. Start the upload again." }, { status: 410 });
  }

  const contentRange = request.headers.get("content-range");
  if (!contentRange) return NextResponse.json({ error: "Content-Range is required." }, { status: 400 });

  let bytes: Uint8Array;
  try {
    bytes = await readDriveUploadChunk(request.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read this upload chunk.";
    return NextResponse.json({ error: message }, { status: 413 });
  }

  const query = contentRange === "bytes */" + session.fileSizeBytes && bytes.byteLength === 0;
  if (!query && !isValidDriveChunk({
    contentRange,
    byteLength: bytes.byteLength,
    totalBytes: session.fileSizeBytes,
  })) {
    return NextResponse.json({ error: "Upload chunk size or byte range is invalid." }, { status: 400 });
  }
  if (!query && contentRange.startsWith("bytes 0-") &&
      new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-") {
    return NextResponse.json({ error: "The uploaded content does not have a valid PDF signature." }, { status: 400 });
  }

  try {
    const accessToken = await getDriveAccessToken();
    const result = await sendResumablePdfChunk({
      accessToken,
      sessionUri: session.sessionUri,
      contentRange,
      bytes,
    });

    if (result.status === 308) {
      return NextResponse.json({ nextOffset: parseDriveUploadOffset(result.range, session.fileSizeBytes), complete: false });
    }
    if (result.status === 404 || result.status === 410) {
      return NextResponse.json({ error: "Google Drive upload session expired. Start again." }, { status: 410 });
    }
    if (result.status === 200 || result.status === 201) {
      const saved = await saveCompletedUpload(supabase, session, result.file ?? {});
      return NextResponse.json({ nextOffset: session.fileSizeBytes, complete: true, ...saved });
    }
    if (result.status === 429 || result.status >= 500) {
      return NextResponse.json({ error: "Google Drive is temporarily unavailable. Resume this upload shortly." }, { status: 503 });
    }
    return NextResponse.json({ error: "Google Drive rejected this upload chunk." }, { status: 502 });
  } catch {
    logSafeOperationalEvent("upload_chunk_failed", { route: "/api/documents/upload/resumable/chunk", errorCode: "UPLOAD_CHUNK_FAILED" });
    return NextResponse.json({ error: "The upload could not be completed. Resume the same file to check the last confirmed byte." }, { status: 502 });
  }
}
