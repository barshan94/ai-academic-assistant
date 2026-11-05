export type OfflineNoteSource = {
  ref: string;
  questionId: string;
  questionNumber: string | null;
  questionText: string;
  pageId: string | null;
  pageNumber: number | null;
  extractionMethod: string | null;
  pageText: string | null;
};

export type OfflineChapterNote = {
  title: string;
  summary: string;
  concepts: string[];
  formulas: string[];
  workedExamples: string[];
  revisionPrompts: string[];
  sourceReferences: Array<{
    ref: string;
    questionId: string;
    pageId: string | null;
    pageNumber: number | null;
    extractionMethod: string | null;
  }>;
};

/**
 * Zero-cost, deterministic note assembly. This deliberately does not invent
 * explanations, solve questions, infer syllabus coverage, or claim AI quality.
 * Every extracted item remains linked to its approved source.
 */
export function buildOfflineChapterNote(input: {
  board: string;
  qualification: string;
  subject: string;
  chapter: string;
  sources: OfflineNoteSource[];
}): OfflineChapterNote {
  if (!input.sources.length || input.sources.length > 12) {
    throw new Error("OFFLINE_NOTE_SOURCES_INVALID");
  }

  const seenRefs = new Set<string>();
  for (const source of input.sources) {
    if (
      !/^S(?:[1-9]|1[0-2])$/.test(source.ref) ||
      seenRefs.has(source.ref) ||
      !source.questionId.trim() ||
      !source.questionText.trim() ||
      source.questionText.length > 20_000 ||
      (source.pageNumber !== null && (!Number.isInteger(source.pageNumber) || source.pageNumber < 1)) ||
      (source.pageText !== null && source.pageText.length > 100_000) ||
      (source.extractionMethod !== null && !["pdf_text", "ocr", "manual"].includes(source.extractionMethod))
    ) throw new Error("OFFLINE_NOTE_SOURCE_INVALID");
    seenRefs.add(source.ref);
  }

  const clean = (value: string) => value.replace(/\s+/g, " ").trim();
  const unique = (values: string[], limit: number) => {
    const found = new Set<string>();
    return values.map(clean).filter((value) => {
      const key = value.toLocaleLowerCase();
      if (!value || found.has(key)) return false;
      found.add(key);
      return true;
    }).slice(0, limit);
  };

  const concepts = unique(input.sources.map((source) =>
    clean(source.questionText).slice(0, 260) + " [" + source.ref + "]"
  ), 30);

  const formulaCandidates: string[] = [];
  for (const source of input.sources) {
    for (const line of (source.pageText ?? "").split(/\r?\n/)) {
      const candidate = clean(line);
      if (
        candidate.length >= 3 && candidate.length <= 180 &&
        /[=≈≠≤≥→⇌]/.test(candidate) &&
        /[A-Za-z0-9]/.test(candidate)
      ) formulaCandidates.push(candidate + " [" + source.ref + "]");
    }
  }

  const revisionPrompts = input.sources.map((source) => {
    const number = source.questionNumber ? " " + source.questionNumber : "";
    return "Attempt question" + number + " independently, show every step, and check units/working. Source: [" + source.ref + "]";
  });

  const sourcePageCount = input.sources.filter((source) => Boolean(source.pageText?.trim())).length;
  const summary = [
    "Free offline draft assembled from " + input.sources.length + " owner-approved question(s)" +
      (sourcePageCount ? " and " + sourcePageCount + " extracted source page(s)." : "."),
    "It preserves source question wording and candidate expressions; it does not generate explanations, solve problems, verify formulas, or establish complete syllabus coverage.",
    "Check OCR/PDF extraction against the original documents and add teacher-written explanations before approving this note.",
  ].join(" ");

  return {
    title: input.chapter.trim().slice(0, 160) + " — source-based revision draft",
    summary,
    concepts,
    formulas: unique(formulaCandidates, 20),
    workedExamples: [],
    revisionPrompts,
    sourceReferences: input.sources.map((source) => ({
      ref: source.ref,
      questionId: source.questionId,
      pageId: source.pageId,
      pageNumber: source.pageNumber,
      extractionMethod: source.extractionMethod,
    })),
  };
}
