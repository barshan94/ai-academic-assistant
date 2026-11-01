const RESPONSE_POLICY_HEADERS = [
  "Cache-Control",
  "Expires",
  "Pragma",
  "Content-Security-Policy",
  "X-Robots-Tag",
] as const;

/**
 * Preserve security, cache and crawler policy when middleware replaces a
 * response (for example, while refreshing Supabase auth cookies).
 */
export function copyResponsePolicyHeaders(source: Headers, destination: Headers) {
  for (const header of RESPONSE_POLICY_HEADERS) {
    const value = source.get(header);
    if (value !== null) destination.set(header, value);
  }
}
