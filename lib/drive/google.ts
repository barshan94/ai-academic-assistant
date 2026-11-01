import "server-only";
import { decryptRefreshToken } from "./crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";

const MAX_DRIVE_PDF_BYTES = 50 * 1024 * 1024;
const MAX_OCR_TEXT_BYTES = 10 * 1024 * 1024;
const MAX_GOOGLE_METADATA_BYTES = 64 * 1024;

async function readResponseBytesBounded(response: Response, maxBytes: number, description: string) {
  const declaredLength = response.headers.get("content-length");
  if (declaredLength && /^\d+$/.test(declaredLength) && Number(declaredLength) > maxBytes) {
    await response.body?.cancel();
    throw new Error(description + " exceeded its size limit.");
  }
  if (!response.body) throw new Error(description + " returned an empty response.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error(description + " exceeded its size limit.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const output = Buffer.allocUnsafe(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

export async function readGoogleJsonResponseBounded<T>(response: Response, maxBytes: number, description: string): Promise<T> {
  const bytes = await readResponseBytesBounded(response, maxBytes, description);
  try {
    const parsed: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid JSON object.");
    return parsed as T;
  } catch {
    throw new Error(description + " returned invalid JSON.");
  }
}

function isGoogleDriveUploadSessionUri(value: string) {
  try {
    const uri = new URL(value);
    return uri.protocol === "https:" && uri.hostname === "www.googleapis.com" &&
      !uri.username && !uri.password &&
      /^\/upload\/drive\/v3\/files(?:\/|$)/.test(uri.pathname);
  } catch {
    return false;
  }
}

function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google Drive OAuth environment variables are not configured.");
  }
  return { clientId, clientSecret, redirectUri };
}

export function getDriveScope() {
  return DRIVE_FILE_SCOPE;
}

export async function getDriveAccessToken() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("You must sign in before using Google Drive.");

  const { data, error } = await supabase
    .from("drive_connections")
    .select("encrypted_refresh_token,granted_scope")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error || !data?.encrypted_refresh_token) {
    throw new Error("Connect Google Drive before uploading documents.");
  }
  if (data.granted_scope !== DRIVE_FILE_SCOPE) {
    throw new Error("Reconnect Google Drive and grant only the requested file access.");
  }

  const { clientId, clientSecret } = getGoogleConfig();
  let refreshToken: string;
  try {
    refreshToken = decryptRefreshToken(data.encrypted_refresh_token);
  } catch {
    throw new Error("The stored Google Drive connection cannot be opened. Reconnect Google Drive.");
  }
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  const payload = await readGoogleJsonResponseBounded<{ access_token?: string }>(response, MAX_GOOGLE_METADATA_BYTES, "Google OAuth response");
  if (!response.ok || !payload.access_token) {
    throw new Error("Google Drive authorization failed. Reconnect your account and try again.");
  }
  return payload.access_token;
}

export async function uploadPdfToDrive(input: {
  accessToken: string;
  fileName: string;
  bytes: Uint8Array;
}) {
  const boundary = "academic_assistant_" + crypto.randomUUID().replaceAll("-", "");
  const metadata = JSON.stringify({ name: input.fileName, mimeType: "application/pdf" });
  const prefix = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`,
  );
  const suffix = Buffer.from(`\r\n--${boundary}--`);
  const body = Buffer.concat([prefix, Buffer.from(input.bytes), suffix]);

  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,size", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
      "Content-Length": String(body.byteLength),
    },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });

  const result = await readGoogleJsonResponseBounded<{ id?: string; webViewLink?: string }>(response, MAX_GOOGLE_METADATA_BYTES, "Google Drive upload metadata");
  if (!response.ok || !result.id) {
    throw new Error("Google Drive could not save the PDF. Check your connection and available Drive storage.");
  }
  return { id: result.id, webViewLink: result.webViewLink ?? null };
}

export async function deleteDriveFile(accessToken: string, fileId: string) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok && response.status !== 404) {
    throw new Error("Could not remove the orphaned Google Drive file.");
  }
}


export async function extractTextFromDrivePdf(input: {
  accessToken: string;
  driveFileId: string;
}) {
  const sourceResponse = await fetch(
    "https://www.googleapis.com/drive/v3/files/" + encodeURIComponent(input.driveFileId) + "?alt=media",
    { headers: { Authorization: "Bearer " + input.accessToken }, cache: "no-store", signal: AbortSignal.timeout(30_000) },
  );
  if (!sourceResponse.ok) throw new Error("Could not download the archived PDF from Google Drive.");
  const sourceBytes = await readResponseBytesBounded(sourceResponse, MAX_DRIVE_PDF_BYTES, "Archived PDF");

  const boundary = "academic_ocr_" + crypto.randomUUID().replaceAll("-", "");
  const metadata = JSON.stringify({
    name: "Academic Assistant OCR temporary " + Date.now(),
    mimeType: "application/vnd.google-apps.document",
  });
  const prefix = Buffer.from(
    "--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" +
    metadata + "\r\n--" + boundary + "\r\nContent-Type: application/pdf\r\n\r\n",
  );
  const suffix = Buffer.from("\r\n--" + boundary + "--");
  const body = Buffer.concat([prefix, sourceBytes, suffix]);

  const convertResponse = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&ocrLanguage=en&fields=id",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + input.accessToken,
        "Content-Type": "multipart/related; boundary=" + boundary,
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    },
  );
  const convertedBytes = await readResponseBytesBounded(convertResponse, MAX_GOOGLE_METADATA_BYTES, "Google Drive OCR conversion metadata");
  let converted: { id?: string };
  try { converted = JSON.parse(convertedBytes.toString("utf8")) as { id?: string }; }
  catch { throw new Error("Google Drive returned invalid OCR conversion metadata."); }
  if (!convertResponse.ok || !converted.id) {
    throw new Error("Google Drive could not extract text from this PDF. The file may be unreadable or unsupported.");
  }

  try {
    const exportResponse = await fetch(
      "https://www.googleapis.com/drive/v3/files/" + encodeURIComponent(converted.id) + "/export?mimeType=text%2Fplain",
      { headers: { Authorization: "Bearer " + input.accessToken }, cache: "no-store", signal: AbortSignal.timeout(20_000) },
    );
    if (!exportResponse.ok) throw new Error("Google Drive OCR export failed.");
    const extractedBytes = await readResponseBytesBounded(exportResponse, MAX_OCR_TEXT_BYTES, "Extracted OCR text");
    return new TextDecoder("utf-8", { fatal: true }).decode(extractedBytes);
  } finally {
    await deleteDriveFile(input.accessToken, converted.id);
  }
}


export async function revokeDriveRefreshToken(refreshToken: string) {
  try {
    const response = await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: refreshToken }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    // Google returns 400 when a token is invalid or already revoked. Treat that
    // response as idempotent success; transient server errors remain retryable.
    return response.ok || response.status === 400;
  } catch {
    // Network failures must not be mistaken for a successful revocation.
    return false;
  }
}

export async function initiateResumablePdfUpload(input: {
  accessToken: string;
  fileName: string;
  fileSizeBytes: number;
}) {
  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,webViewLink,size",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + input.accessToken,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": "application/pdf",
        "X-Upload-Content-Length": String(input.fileSizeBytes),
      },
      body: JSON.stringify({ name: input.fileName, mimeType: "application/pdf" }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    },
  );
  const sessionUri = response.headers.get("Location");
  if (!response.ok || !sessionUri) {
    throw new Error("Google Drive could not start a resumable upload session.");
  }
  if (!isGoogleDriveUploadSessionUri(sessionUri)) {
    throw new Error("Google Drive returned an invalid upload session URL.");
  }
  return sessionUri;
}

export async function sendResumablePdfChunk(input: {
  accessToken: string;
  sessionUri: string;
  contentRange: string;
  bytes: Uint8Array;
}) {
  if (!isGoogleDriveUploadSessionUri(input.sessionUri)) {
    throw new Error("Invalid Google Drive upload session.");
  }

  const response = await fetch(input.sessionUri, {
    method: "PUT",
    headers: {
      Authorization: "Bearer " + input.accessToken,
      "Content-Range": input.contentRange,
      ...(input.bytes.byteLength ? { "Content-Length": String(input.bytes.byteLength) } : {}),
    },
    body: input.bytes.byteLength ? Buffer.from(input.bytes) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
    redirect: "manual",
  });

  const range = response.headers.get("Range");
  let file: { id?: string; webViewLink?: string; name?: string; mimeType?: string; size?: string } | null = null;
  if (response.status === 200 || response.status === 201) {
    try {
      file = await readGoogleJsonResponseBounded<{
        id?: string;
        webViewLink?: string;
        name?: string;
        mimeType?: string;
        size?: string;
      }>(response, MAX_GOOGLE_METADATA_BYTES, "Google Drive resumable upload metadata");
    } catch {
      throw new Error("Google Drive returned an unreadable upload response.");
    }
  }

  return { status: response.status, range, file };
}
