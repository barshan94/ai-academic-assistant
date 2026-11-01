import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logSafeOperationalEvent } from "@/lib/observability/safe-log";
import { getDriveAccessToken, initiateResumablePdfUpload } from "@/lib/drive/google";
import { encryptDriveUploadSession } from "@/lib/drive/crypto";
import { MAX_UPLOAD_BYTES, safeFileName } from "@/lib/documents/upload-limits";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to upload documents." }, { status: 401 });

  try {
    const body = await request.json() as {
      fileName?: string;
      fileSizeBytes?: number;
      sha256?: string;
      pageCount?: number | null;
    };
    const fileSizeBytes = body.fileSizeBytes;
    const sha256 = body.sha256;
    if (!Number.isSafeInteger(fileSizeBytes) || !fileSizeBytes || fileSizeBytes < 1 || fileSizeBytes > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Files must be between 1 byte and 50 MB." }, { status: 400 });
    }
    if (typeof sha256 !== "string" || !/^[a-f0-9]{64}$/.test(sha256)) {
      return NextResponse.json({ error: "The file checksum is invalid." }, { status: 400 });
    }
    if (body.pageCount !== null && body.pageCount !== undefined &&
        (!Number.isInteger(body.pageCount) || body.pageCount < 1 || body.pageCount > 50)) {
      return NextResponse.json({ error: "Image batches must contain no more than 50 pages." }, { status: 400 });
    }

    const fileName = safeFileName(typeof body.fileName === "string" ? body.fileName : "");
    if (!fileName.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only normalized PDF documents can be archived." }, { status: 400 });
    }

    const { data: duplicate, error: duplicateError } = await supabase
      .from("documents").select("id").eq("owner_id", user.id).eq("sha256", sha256).maybeSingle();
    if (duplicateError) return NextResponse.json({ error: "Could not check for duplicate documents." }, { status: 500 });
    if (duplicate) return NextResponse.json({ duplicate: true }, { status: 409 });

    const { data: uploadAllowed, error: quotaError } = await supabase.rpc("consume_document_upload_quota");
    if (quotaError) {
      logSafeOperationalEvent("document_upload_quota_unavailable", { route: "/api/documents/upload/resumable/start", errorCode: "UPLOAD_QUOTA_RPC_FAILED" });
      return NextResponse.json({ error: "Upload protection is temporarily unavailable. Try again shortly." }, { status: 503 });
    }
    if (!uploadAllowed) {
      logSafeOperationalEvent("document_upload_quota_exhausted", { route: "/api/documents/upload/resumable/start", errorCode: "UPLOAD_QUOTA_REACHED" });
      return NextResponse.json({ error: "Upload limit reached: no more than 10 new documents per hour or 50 per day. Try again later." }, { status: 429 });
    }

    const accessToken = await getDriveAccessToken();
    const sessionUri = await initiateResumablePdfUpload({ accessToken, fileName, fileSizeBytes });
    const sessionToken = encryptDriveUploadSession(JSON.stringify({
      ownerId: user.id,
      sessionUri,
      fileName,
      fileSizeBytes,
      sha256,
      pageCount: body.pageCount ?? null,
      expiresAt: Date.now() + 6 * 24 * 60 * 60 * 1000,
    }));

    return NextResponse.json({ sessionToken, chunkSize: 1024 * 1024 });
  } catch {
    logSafeOperationalEvent("upload_session_start_failed", { route: "/api/documents/upload/resumable/start", errorCode: "UPLOAD_SESSION_START_FAILED" });
    return NextResponse.json({ error: "Could not start the Google Drive upload. Check your connection and try again." }, { status: 500 });
  }
}
