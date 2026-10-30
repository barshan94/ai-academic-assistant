"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decryptRefreshToken } from "@/lib/drive/crypto";
import { revokeDriveRefreshToken } from "@/lib/drive/google";

export async function disconnectDrive() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data: connection, error: readError } = await supabase
    .from("drive_connections")
    .select("encrypted_refresh_token")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (readError) redirect("/dashboard/documents?drive=disconnect_failed");

  let revoked = true;
  if (connection?.encrypted_refresh_token) {
    try {
      const refreshToken = decryptRefreshToken(connection.encrypted_refresh_token);
      revoked = await revokeDriveRefreshToken(refreshToken);
    } catch {
      revoked = false;
    }
  }

  const { error: deleteError } = await supabase
    .from("drive_connections")
    .delete()
    .eq("owner_id", user.id);

  if (deleteError) redirect("/dashboard/documents?drive=disconnect_failed");
  redirect("/dashboard/documents?drive=" + (revoked ? "disconnected" : "revocation_warning"));
}
