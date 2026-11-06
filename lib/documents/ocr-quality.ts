export type OcrQuality = "likely_readable" | "needs_correction";

function hasFlattenedTableRisk(text: string) {
  // Do not assume OCR preserves line breaks: PDF-to-Docs conversion can
  // concatenate labelled rows into a single paragraph.
  const rowMarkers = text.match(/(?:^|\s)\([a-z]\)\s+/gimu) ?? [];
  const tableHeaders = [
    /\b(?:object|solid|item|product|name)\b/iu,
    /\b(?:radius|length|width|height|mass|time|quantity)\b/iu,
    /\b(?:surface\s+area|total|curved|volume|value|result)\b/iu,
  ].filter((pattern) => pattern.test(text)).length;

  // Treat separators as evidence only when they occur on table-like lines;
  // arbitrary paragraph spacing must not suppress a needed review warning.
  const tableLikeLines = text.split(/\r?\n/u).filter((line) =>
    /\([a-z]\)/iu.test(line) || /\b(?:radius|height|surface\s+area|total|curved)\b/iu.test(line),
  );
  const visiblyAlignedLines = tableLikeLines.filter((line) => / {3,}/u.test(line)).length;
  const hasColumnSeparators = text.includes("\t") || /\|/u.test(text) || visiblyAlignedLines >= 2;

  return rowMarkers.length >= 3 && tableHeaders >= 2 && !hasColumnSeparators;
}

export function assessOcrTextQuality(text: string): OcrQuality {
  const compact = text.replace(/\s/gu, "");
  if (compact.length < 40) return "needs_correction";

  const tokens = text.match(/[\p{L}\p{N}]+/gu) ?? [];
  const fragments = tokens.filter((token) => [...token].length === 1).length;
  const letters = text.match(/\p{L}/gu) ?? [];
  const latinLetters = text.match(/\p{Script=Latin}/gu) ?? [];
  const readable = (text.match(/[\p{L}\p{N}]/gu) ?? []).length;
  const readableRatio = readable / compact.length;
  const fragmentRatio = tokens.length ? fragments / tokens.length : 1;
  const mostlyLatin = letters.length > 0 && latinLetters.length / letters.length > 0.8;
  const mixedScriptNoise = mostlyLatin && (letters.length - latinLetters.length) / letters.length > 0.003;

  // This is a warning heuristic, not a confidence score or automatic approval.
  return readableRatio < 0.65
    || (tokens.length >= 12 && fragmentRatio > 0.38)
    || mixedScriptNoise
    || hasFlattenedTableRisk(text)
    ? "needs_correction"
    : "likely_readable";
}
