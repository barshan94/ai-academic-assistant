import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getAIProviderConfigs } from "@/lib/ai/provider";
import { REQUIRED_READINESS_TABLES } from "@/lib/health/required-readiness-tables";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !supplied) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(supplied);
  return left.length === right.length && timingSafeEqual(left, right);
}

function hasValidSupabaseUrl() {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    const secureProtocol = url.protocol === "https:";
    const localDevelopmentUrl = process.env.NODE_ENV !== "production" &&
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1");
    return (secureProtocol || localDevelopmentUrl) &&
      !url.username && !url.password && !url.search && !url.hash && url.pathname === "/";
  } catch {
    return false;
  }
}

function hasValidGoogleRedirectUri() {
  try {
    const raw = process.env.GOOGLE_DRIVE_REDIRECT_URI;
    if (!raw) return false;
    const url = new URL(raw);
    const localDevelopmentUrl = process.env.NODE_ENV !== "production" &&
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1");
    return (url.protocol === "https:" || localDevelopmentUrl) &&
      !url.username && !url.password && !url.search && !url.hash &&
      url.pathname === "/api/drive/callback";
  } catch {
    return false;
  }
}

function hasValidDriveEncryptionKey() {
  const encoded = process.env.DRIVE_TOKEN_ENCRYPTION_KEY;
  if (!encoded || !/^[A-Za-z0-9+/]{43}=$/.test(encoded)) return false;

  const decoded = Buffer.from(encoded, "base64");
  return decoded.length === 32 && decoded.toString("base64") === encoded;
}

function hasAIProvidersForRequiredTasks() {
  try {
    getAIProviderConfigs("answer");
    getAIProviderConfigs("chapter-note");
    return true;
  } catch {
    return false;
  }
}

/**
 * Verify the configured Supabase Data API is reachable without returning
 * database content. The service key is used only in this server-only route;
 * session persistence and token refresh are disabled.
 */
async function hasLiveSupabaseConnection() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return false;

  try {
    const supabase = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: (input, init) => fetch(input, {
          ...init,
          signal: AbortSignal.timeout(5_000),
          redirect: "error",
        }),
      },
    });

    // A reachable PostgREST endpoint alone is insufficient. Probe the
    // tables required by the shipped document, solver, syllabus, notes and
    // study workflows so a partially migrated database cannot report ready.
    // These are zero-row HEAD requests; no academic content is returned.
    const results = await Promise.all(REQUIRED_READINESS_TABLES.map((table) =>
      supabase.from(table).select("*", { head: true }).limit(1),
    ));

    return results.every(({ error }) => !error);
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
    hasValidGoogleRedirectUri() &&
    (process.env.CRON_SECRET?.length ?? 0) >= 32 &&
    hasValidDriveEncryptionKey() &&
    hasAIProvidersForRequiredTasks()
  );
  const databaseConnected = configured && await hasLiveSupabaseConnection();
  const ready = Boolean(configured && databaseConnected);

  return NextResponse.json(
    { status: ready ? "ready" : "not_ready" },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
