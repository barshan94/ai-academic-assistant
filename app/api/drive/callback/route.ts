import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { encryptRefreshToken } from "@/lib/drive/crypto";

type GoogleTokenResponse = {
  refresh_token?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const [expectedState, expectedUserId] = (request.cookies.get("drive_oauth_state")?.value ?? "").split(".");

  const finish = (path: "/dashboard/documents" | "/login", status?: string) => {
    const destination = new URL(path, request.url);
    if (status) destination.searchParams.set("drive", status);
    const response = NextResponse.redirect(destination);
    response.cookies.set("drive_oauth_state", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/drive/callback",
      maxAge: 0,
    });
    return response;
  };

  if (!state || !expectedState || state !== expectedState || !expectedUserId || !code) {
    return finish("/dashboard/documents", "invalid_callback");
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return finish("/login");
  if (user.id !== expectedUserId) return finish("/dashboard/documents", "invalid_callback");

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return finish("/dashboard/documents", "not_configured");

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
      cache: "no-store",
    });

    const tokenData = await tokenResponse.json() as GoogleTokenResponse;
    if (!tokenResponse.ok) return finish("/dashboard/documents", "token_exchange_failed");

    const requiredScope = "https://www.googleapis.com/auth/drive.file";
    const grantedScopes = (tokenData.scope ?? requiredScope).split(/\s+/).filter(Boolean);
    if (grantedScopes.length !== 1 || grantedScopes[0] !== requiredScope) {
      return finish("/dashboard/documents", "scope_mismatch");
    }

    let encryptedToken: string | null = tokenData.refresh_token
      ? encryptRefreshToken(tokenData.refresh_token)
      : null;

    if (!encryptedToken) {
      const { data: existing } = await supabase
        .from("drive_connections")
        .select("encrypted_refresh_token")
        .eq("owner_id", user.id)
        .maybeSingle();
      encryptedToken = existing?.encrypted_refresh_token ?? null;
    }

    if (!encryptedToken) return finish("/dashboard/documents", "missing_refresh_token");

    const { error } = await supabase.from("drive_connections").upsert({
      owner_id: user.id,
      encrypted_refresh_token: encryptedToken,
      granted_scope: requiredScope,
      updated_at: new Date().toISOString(),
    });
    return finish("/dashboard/documents", error ? "save_failed" : "connected");
  } catch {
    return finish("/dashboard/documents", "token_exchange_failed");
  }
}
