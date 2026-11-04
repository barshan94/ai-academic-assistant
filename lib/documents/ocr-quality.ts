export type OcrQuality = "likely_readable" | "needs_correction";

export function assessOcrTextQuality(text: string): OcrQuality {
  const compact = text.replace(/\s/gu, "");
  if (compact.length < 40) return "needs_correction";
  const tokens = text.match(/[\p{L}\p{N}]+/gu) ?? [];
  const fragments = tokens.filter((token) => [...token].length === 1).length;
  const readable = (text.match(/[\p{L}\p{N}]/gu) ?? []).length;
  const readableRatio = readable / compact.length;
  const fragmentRatio = tokens.length ? fragments / tokens.length : 1;
  return readableRatio < 0.65 || (tokens.length >= 12 && fragmentRatio > 0.38)
    ? "needs_correction"
    : "likely_readable";
}
