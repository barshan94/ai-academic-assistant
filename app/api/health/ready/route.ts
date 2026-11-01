import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getAIProviderConfigs } from "@/lib/ai/provider";

export const runtime = "nodejs";

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\\s+/i, "");
  if (!expected || !supplied) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(supplied);
  return left.length === right.length && timingSafeEqual(left, right);
}

function hasValidSupabaseUrl() {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    return url.protocol === "https:" || (
      process.env.NODE_ENV !== "production" &&
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    );
  } catch {
    return false;
  }
}

function hasValidDriveEncryptionKey() {
  const encoded = process.env.DRIVE_TOKEN_ENCRYPTION_KEY;
  return Boolean(encoded && Buffer.from(encoded, "base64").length === 32);
}

function hasAIProvider() {
  try {
    getAIProviderConfigs("answer");
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json(
      { status: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const configured = Boolean(
    hasValidSupabaseUrl() &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() &&
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() &&
    process.env.GOOGLE_CLIENT_ID?.trim() &&
    process.env.GOOGLE_CLIENT_SECRET?.trim() &&
    (process.env.CRON_SECRET?.length ?? 0) >= 32 &&
    hasValidDriveEncryptionKey() &&
    hasAIProvider()
  );

  return NextResponse.json(
    { status: configured ? "ready" : "not_ready" },
    {
      status: configured ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
