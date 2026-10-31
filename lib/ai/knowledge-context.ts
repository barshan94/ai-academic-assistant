export type ApprovedChapterNoteRecord = {
  id: string;
  version_number: number;
  title: string;
  content_json: unknown;
};

export type PreparedKnowledgeSource = {
  sourceRef: string;
  noteVersionId: string;
  versionNumber: number;
  title: string;
  text: string;
};

function readText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized ? normalized.slice(0, maxLength) : null;
}

function readTextList(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxItems)
    .map((item) => readText(item, maxLength))
    .filter((item): item is string => item !== null);
}

export function prepareApprovedChapterKnowledge(
  notes: ApprovedChapterNoteRecord[],
): PreparedKnowledgeSource[] {
  return notes.slice(0, 3).flatMap((note, index) => {
    if (!note.id || !Number.isInteger(note.version_number) || note.version_number < 1) return [];
    if (!note.content_json || typeof note.content_json !== "object" || Array.isArray(note.content_json)) return [];

    const content = note.content_json as Record<string, unknown>;
    const sections: string[] = [];
    const summary = readText(content.summary, 1800);
    if (summary) sections.push("Summary: " + summary);

    const concepts = readTextList(content.concepts, 12, 350);
    if (concepts.length) sections.push("Concepts: " + concepts.join("; "));

    const formulas = readTextList(content.formulas, 10, 300);
    if (formulas.length) sections.push("Formulas: " + formulas.join("; "));

    const workedExamples = readTextList(content.workedExamples, 3, 600);
    if (workedExamples.length) sections.push("Worked examples: " + workedExamples.join(" | "));

    const revisionPrompts = readTextList(content.revisionPrompts, 6, 250);
    if (revisionPrompts.length) sections.push("Revision prompts: " + revisionPrompts.join("; "));

    const text = sections.join("\n").slice(0, 3000);
    if (!text) return [];

    return [{
      sourceRef: "K" + (index + 1),
      noteVersionId: note.id,
      versionNumber: note.version_number,
      title: note.title.trim().slice(0, 200),
      text,
    }];
  });
}

export function knowledgeSourceProvenance(sources: PreparedKnowledgeSource[]) {
  return sources.map((source) => ({
    note_id: source.noteVersionId,
    version_number: source.versionNumber,
    title: source.title,
  }));
}
