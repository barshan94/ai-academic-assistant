export type SyllabusCandidate = {
  id: string;
  title: string;
  code?: string | null;
};

export type SyllabusTextMatch = SyllabusCandidate & {
  matchedTerms: string[];
  score: number;
  reasons: string[];
};

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "calculate", "describe",
  "determine", "discuss", "explain", "find", "for", "from", "give", "how",
  "in", "into", "is", "it", "of", "on", "or", "state", "show", "solve",
  "that", "the", "their", "this", "to", "use", "what", "when", "where",
  "which", "with", "প্রতি", "এবং", "একটি", "কী", "কি", "কর", "করো",
  "নির্ণয়", "নির্ণয়", "ব্যাখ্যা", "দেখাও", "হলো", "হয়", "হয়",
]);

function normalizeText(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function meaningfulTokens(value: string): string[] {
  return [...new Set(normalizeText(value).split(/\s+/u).filter(
    (token) => token.length > 1 && !STOP_WORDS.has(token),
  ))];
}

/**
 * Ranks catalogue labels by transparent lexical overlap only.
 * Scores are ordering aids, not probabilities or evidence of correctness.
 */
export function rankSyllabusTextMatches(
  questionText: string,
  candidates: SyllabusCandidate[],
  limit = 4,
): SyllabusTextMatch[] {
  const question = normalizeText(questionText);
  const questionTokens = new Set(meaningfulTokens(questionText));
  if (!question || questionTokens.size === 0 || limit <= 0) return [];

  return candidates.map((candidate) => {
    const label = normalizeText(candidate.title);
    const labelTokens = meaningfulTokens(candidate.title);
    const matchedTerms = labelTokens.filter((token) => questionTokens.has(token));
    const exactPhrase = label.length >= 4 && question.includes(label);
    const coverage = labelTokens.length ? matchedTerms.length / labelTokens.length : 0;
    const score = matchedTerms.length * 2 + coverage + (exactPhrase ? 3 : 0);
    const reasons: string[] = [];
    if (matchedTerms.length) reasons.push("Shared terms: " + matchedTerms.join(", "));
    if (exactPhrase) reasons.push("The full catalogue label appears in the question text");
    return { ...candidate, matchedTerms, score, reasons };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}
