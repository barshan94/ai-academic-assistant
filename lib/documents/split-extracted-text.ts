export function splitExtractedText(text: string) {
  const normalized = text.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return [];
  const pages = normalized.split(/\f+/).map((page) => page.trim()).filter(Boolean);
  return pages.length ? pages : [normalized];
}
