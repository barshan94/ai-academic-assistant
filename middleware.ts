import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function buildContentSecurityPolicy(nonce: string) {
  const scriptSources = ["'self'", "'nonce-" + nonce + "'", "'strict-dynamic'"];
  const connectSources = [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://www.googleapis.com",
    "https://oauth2.googleapis.com",
  ];

  if (process.env.NODE_ENV !== "production") {
    scriptSources.push("'unsafe-eval'");
    connectSources.push("ws://localhost:*", "http://localhost:*", "http://127.0.0.1:*");
  }

  const configuredPool = process.env.AI_PROVIDER_POOL?.trim();
  let providerBases: string[] = [];
  if (configuredPool) {
    try {
      const parsed: unknown = JSON.parse(configuredPool);
      if (Array.isArray(parsed) && parsed.length <= 8) {
        providerBases = parsed.flatMap((item) =>
          item && typeof item === "object" && typeof (item as { baseUrl?: unknown }).baseUrl === "string"
            ? [(item as { baseUrl: string }).baseUrl]
            : [],
        );
      }
    } catch {
      // Invalid provider-pool configuration is rejected by the server router.
    }
  } else {
    providerBases = [process.env.AI_API_BASE_URL?.trim() || "https://api.openai.com/v1"];
  }

  for (const providerBase of providerBases) {
    try {
      const providerOrigin = new URL(providerBase).origin;
      if (providerOrigin.startsWith("https://") ||
        (process.env.NODE_ENV !== "production" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(providerOrigin))) {
        connectSources.push(providerOrigin);
      }
    } catch {
      // Invalid provider URLs are rejected by the server-side adapter.
      // Do not weaken the browser policy to accommodate an invalid URL.
    }
  }

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src " + scriptSources.join(" "),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src " + Array.from(new Set(connectSources)).join(" "),
    "frame-src 'self' https://accounts.google.com",
  ];

  if (process.env.NODE_ENV === "production") directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

function createSecureNextResponse(requestHeaders: Headers, contentSecurityPolicy: string) {
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  return response;
}

function copyAuthResponse(source: NextResponse, destination: NextResponse) {
  source.cookies.getAll().forEach((cookie) => destination.cookies.set(cookie));
  for (const header of ["Cache-Control", "Expires", "Pragma", "Content-Security-Policy"]) {
    const value = source.headers.get(header);
    if (value) destination.headers.set(header, value);
  }
}

export async function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const contentSecurityPolicy = buildContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  let response = createSecureNextResponse(requestHeaders, contentSecurityPolicy);

  // Public pages and API routes receive the same response policy. Only the
  // dashboard path performs the authentication gate below.
  if (!request.nextUrl.pathname.startsWith("/dashboard")) return response;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "?error=configuration";
    const redirectResponse = NextResponse.redirect(loginUrl);
    copyAuthResponse(response, redirectResponse);
    return redirectResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        requestHeaders.set("cookie", request.cookies.toString());
        response = createSecureNextResponse(requestHeaders, contentSecurityPolicy);
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);
    copyAuthResponse(response, redirectResponse);
    return redirectResponse;
  }

  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
