import "server-only";
import { decryptRefreshToken } from "./crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";

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
    .select("encrypted_refresh_token")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error || !data?.encrypted_refresh_token) {
    throw new Error("Connect Google Drive before uploading documents.");
  }

  const { clientId, clientSecret } = getGoogleConfig();
  const refreshToken = decryptRefreshToken(data.encrypted_refresh_token);
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
  });

  const payload = await response.json() as { access_token?: string; error?: string; error_description?: string };
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || "Google Drive token refresh failed.");
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
  });

  const result = await response.json() as { id?: string; webViewLink?: string; error?: { message?: string } };
  if (!response.ok || !result.id) {
    throw new Error(result.error?.message || "Google Drive upload failed.");
  }
  return { id: result.id, webViewLink: result.webViewLink ?? null };
}

export async function deleteDriveFile(accessToken: string, fileId: string) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok && response.status !== 404) {
    throw new Error("Could not remove the orphaned Google Drive file.");
  }
}
