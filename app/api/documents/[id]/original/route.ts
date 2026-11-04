import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { downloadOriginalPdfFromDrive, getDriveAccessToken } from "@/lib/drive/google";
import { safeFileName } from "@/lib/documents/upload-limits";

export const runtime = "nodejs";
export const maxDuration = 45;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Sign in to view this document." }, { status: 401 });
  }

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("drive_file_id,file_name,file_size_bytes,mime_type,sha256")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  // Do not reveal whether another account owns a document ID.
  if (documentError || !document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }
  if (
    !document.drive_file_id ||
    document.mime_type !== "application/pdf" ||
    !document.sha256
  ) {
    return NextResponse.json({ error: "The archived original is not available for verified retrieval." }, { status: 409 });
  }

  try {
    const accessToken = await getDriveAccessToken();
    const bytes = await downloadOriginalPdfFromDrive({
      accessToken,
      driveFileId: document.drive_file_id,
      expectedSizeBytes: document.file_size_bytes,
      expectedSha256: document.sha256,
    });
    const fileName = safeFileName(document.file_name.toLowerCase().endsWith(".pdf")
      ? document.file_name
      : document.file_name + ".pdf");
    const encodedFileName = encodeURIComponent(fileName).replace(/['()*]/g, (character) =>
      "%" + character.charCodeAt(0).toString(16).toUpperCase(),
    );

    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": "inline; filename=\"original.pdf\"; filename*=UTF-8''" + encodedFileName,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "The original PDF could not be retrieved or failed its integrity check. Reconnect Google Drive or contact support." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
