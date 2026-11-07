export type ChapterNoteExportContent = {
  summary?: string;
  concepts?: string[];
  formulas?: string[];
  workedExamples?: string[];
  revisionPrompts?: string[];
  generatedBy?: string;
  generationProvider?: string;
  generationModel?: string;
  verificationStatus?: string;
  sourceReferences?: Array<{
    ref: string;
    questionId: string;
    pageId: string | null;
    pageNumber: number | null;
    extractionMethod: string | null;
  }>;
};

function section(title: string, items: string[] | undefined): string {
  return items?.length
    ? "\n## " + title + "\n\n" + items.map((item) => "- " + item).join("\n") + "\n"
    : "";
}

export function buildChapterNoteMarkdown(title: string, content: ChapterNoteExportContent): string {
  const references = content.sourceReferences?.length
    ? "\n## Source references\n\n" + content.sourceReferences.map((source) =>
        "- [" + source.ref + "] Question ID: " + source.questionId +
        (source.pageId ? " · Page ID: " + source.pageId : "") +
        (source.pageNumber ? " · Page " + source.pageNumber : "") +
        (source.extractionMethod ? " · Extraction: " + source.extractionMethod : "")
      ).join("\n") + "\n"
    : "";
  const provenance = content.generatedBy === "ai"
    ? "> AI-generated draft. Not independently verified. Review every claim against the original sources."
    : content.generatedBy === "offline-extractive"
      ? "> Free offline source-extraction draft. It preserves source wording and candidate expressions; it does not generate explanations or solve questions. Verify extracted text against the original documents."
      : content.generatedBy === "owner-authored"
        ? "> Owner-authored study note. Check against the original sources."
        : "> Study note. Verify its content against the original sources before relying on it.";
  const generationDetails = [
    content.generationProvider ? "- Provider: " + content.generationProvider : "",
    content.generationModel ? "- Model: " + content.generationModel : "",
    content.verificationStatus ? "- Verification status: " + content.verificationStatus : "",
  ].filter(Boolean).join("\\n");
  return [
    "# " + title,
    "",
    provenance,
    generationDetails ? "\\n" + generationDetails + "\\n" : "",
    "",
    content.summary ? "## Summary\n\n" + content.summary + "\n" : "",
    section("Key concepts", content.concepts),
    section("Formulas · syntax scan is not mathematical verification", content.formulas),
    section("Worked examples", content.workedExamples),
    section("Revision prompts", content.revisionPrompts),
    references,
  ].filter(Boolean).join("\n");
}

export function chapterNoteMarkdownFilename(title: string): string {
  const safeTitle = title.trim().replace(/[^a-z0-9-_]+/gi, "-").replace(/^-|-$/g, "").slice(0, 80);
  return (safeTitle || "chapter-note") + ".md";
}
