import "server-only";

export type WebResearchSource = {
  title: string;
  url: string;
  snippet: string;
  publishedAt: string | null;
  rank: number;
};

export class WebResearchConfigurationError extends Error {
  constructor() {
    super("WEB_RESEARCH_NOT_CONFIGURED");
    this.name = "WebResearchConfigurationError";
  }
}

export class WebResearchProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebResearchProviderError";
  }
}

function getBraveApiKey(env: Record<string, string | undefined> = process.env) {
  const provider = env.WEB_SEARCH_PROVIDER?.trim() || "brave";
  const apiKey = env.BRAVE_SEARCH_API_KEY?.trim();
  if (provider !== "brave" || !apiKey) throw new WebResearchConfigurationError();
  return apiKey;
}

export function assertWebResearchConfigured(env: Record<string, string | undefined> = process.env) {
  getBraveApiKey(env);
}

export async function searchWebSources(
  query: string,
  fetcher: typeof fetch = fetch,
  env: Record<string, string | undefined> = process.env,
): Promise<WebResearchSource[]> {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 3 || normalizedQuery.length > 500) {
    throw new WebResearchProviderError("WEB_RESEARCH_QUERY_INVALID");
  }

  const apiKey = getBraveApiKey(env);
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.search = new URLSearchParams({
    q: normalizedQuery,
    count: "10",
    safesearch: "moderate",
  }).toString();

  let response: Response;
  try {
    response = await fetcher(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": apiKey,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    throw new WebResearchProviderError("WEB_RESEARCH_UNAVAILABLE");
  }

  if (!response.ok) {
    throw new WebResearchProviderError("WEB_RESEARCH_HTTP_" + response.status);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new WebResearchProviderError("WEB_RESEARCH_INVALID_RESPONSE");
  }

  if (!payload || typeof payload !== "object") {
    throw new WebResearchProviderError("WEB_RESEARCH_INVALID_RESPONSE");
  }
  const web = (payload as { web?: { results?: unknown } }).web;
  if (!Array.isArray(web?.results)) {
    throw new WebResearchProviderError("WEB_RESEARCH_INVALID_RESPONSE");
  }

  const seen = new Set<string>();
  const results: WebResearchSource[] = [];
  for (const item of web.results) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (typeof record.title !== "string" || typeof record.url !== "string" ||
      typeof record.description !== "string") continue;

    let sourceUrl: URL;
    try {
      sourceUrl = new URL(record.url);
    } catch {
      continue;
    }
    if (sourceUrl.protocol !== "https:" || sourceUrl.username || sourceUrl.password) continue;
    const canonicalUrl = sourceUrl.toString();
    if (seen.has(canonicalUrl)) continue;

    const title = record.title.trim().slice(0, 300);
    const snippet = record.description.trim().slice(0, 2000);
    if (!title || !snippet) continue;

    const publishedAt = typeof record.page_age === "string" &&
      !Number.isNaN(Date.parse(record.page_age))
      ? new Date(record.page_age).toISOString()
      : null;

    seen.add(canonicalUrl);
    results.push({
      title,
      url: canonicalUrl,
      snippet,
      publishedAt,
      rank: results.length + 1,
    });
    if (results.length >= 10) break;
  }

  return results;
}
