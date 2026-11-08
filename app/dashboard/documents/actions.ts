"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decryptRefreshToken } from "@/lib/drive/crypto";
import { revokeDriveRefreshToken } from "@/lib/drive/google";

export async function disconnectDrive() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  let encryptedRefreshToken: string | null = null;
  let readFailed = false;
  try {
    const result = await supabase
      .from("drive_connections")
      .select("encrypted_refresh_token")
      .eq("owner_id", user.id)
      .maybeSingle();
    readFailed = Boolean(result.error);
    encryptedRefreshToken = result.data?.encrypted_refresh_token ?? null;
  } catch {
    readFailed = true;
  }

  if (readFailed) redirect("/dashboard/documents?drive=disconnect_failed");

  let revoked = true;
  if (encryptedRefreshToken) {
    try {
      const refreshToken = decryptRefreshToken(encryptedRefreshToken);
      revoked = await revokeDriveRefreshToken(refreshToken);
    } catch {
      revoked = false;
    }
  }

  // Keep the encrypted refresh token if Google revocation failed. Removing
  // the only stored copy would make a transient failure impossible to retry.
  if (!revoked) redirect("/dashboard/documents?drive=revocation_failed");

  let deleteFailed = false;
  try {
    const result = await supabase
      .from("drive_connections")
      .delete()
      .eq("owner_id", user.id);
    deleteFailed = Boolean(result.error);
  } catch {
    deleteFailed = true;
  }

  if (deleteFailed) redirect("/dashboard/documents?drive=disconnect_failed");
  redirect("/dashboard/documents?drive=disconnected");
}
