import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDriveAccessToken, initiateResumablePdfUpload } from "@/lib/drive/google";
import { encryptDriveUploadSession } from "@/lib/drive/crypto";
import { MAX_UPLOAD_BYTES, safeFileName } from "@/lib/documents/normalize-to-pdf";

export const runtime = "nodejs";

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
      return NextResponse.json({ error: "Files must be between 1 byte and 100 MB." }, { status: 400 });
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start the upload.";
    return NextResponse.json({ error: message.slice(0, 300) }, { status: 500 });
  }
}
