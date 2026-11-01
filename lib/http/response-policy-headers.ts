const RESPONSE_POLICY_HEADERS = new Set([
  "cache-control",
  "expires",
  "pragma",
  "content-security-policy",
  "x-robots-tag",
]);

export function isResponsePolicyHeader(name: string) {
  return RESPONSE_POLICY_HEADERS.has(name.toLowerCase());
}

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
