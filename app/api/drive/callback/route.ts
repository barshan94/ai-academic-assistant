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
  const destination = new URL("/dashboard/documents", request.url);
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const expectedState = request.cookies.get("drive_oauth_state")?.value;

  const response = NextResponse.redirect(destination);
  response.cookies.set("drive_oauth_state", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/drive/callback",
    maxAge: 0,
  });

  if (!state || !expectedState || state !== expectedState || !code) {
    destination.searchParams.set("drive", "invalid_callback");
    return NextResponse.redirect(destination);
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    destination.pathname = "/login";
    return NextResponse.redirect(destination);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    destination.searchParams.set("drive", "not_configured");
    return NextResponse.redirect(destination);
  }

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
  if (!tokenResponse.ok) {
    destination.searchParams.set("drive", "token_exchange_failed");
    return NextResponse.redirect(destination);
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

  if (!encryptedToken) {
    destination.searchParams.set("drive", "missing_refresh_token");
    return NextResponse.redirect(destination);
  }

  const { error } = await supabase.from("drive_connections").upsert({
    owner_id: user.id,
    encrypted_refresh_token: encryptedToken,
    granted_scope: tokenData.scope ?? "https://www.googleapis.com/auth/drive.file",
    updated_at: new Date().toISOString(),
  });
  destination.searchParams.set("drive", error ? "save_failed" : "connected");
  return NextResponse.redirect(destination);
}
