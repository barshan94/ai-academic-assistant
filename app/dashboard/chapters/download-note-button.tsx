"use client";

type NoteContent = {
  summary?: string;
  concepts?: string[];
  formulas?: string[];
  workedExamples?: string[];
  revisionPrompts?: string[];
  generatedBy?: string;
  sourceReferences?: Array<{
    ref: string;
    questionId: string;
    pageId: string | null;
    pageNumber: number | null;
    extractionMethod: string | null;
  }>;
};

function section(title: string, items: string[] | undefined): string {
  return items?.length ? "\n## " + title + "\n\n" + items.map((item) => "- " + item).join("\n") + "\n" : "";
}

export default function DownloadChapterNoteButton({ title, content }: { title: string; content: NoteContent }) {
  function download() {
    const references = content.sourceReferences?.length
      ? "\n## Source references\n\n" + content.sourceReferences.map((source) =>
          "- [" + source.ref + "] Question ID: " + source.questionId +
          (source.pageId ? " · Page ID: " + source.pageId : "") +
          (source.pageNumber ? " · Page " + source.pageNumber : "") +
          (source.extractionMethod ? " · Extraction: " + source.extractionMethod : "")
        ).join("\n") + "\n"
      : "";
    const markdown = [
      "# " + title,
      "",
      content.generatedBy === "ai"
        ? "> AI-generated draft. Not independently verified. Review against original sources before relying on it."
        : "> Owner-authored study note. Check against the original sources.",
      "",
      content.summary ? "## Summary\n\n" + content.summary + "\n" : "",
      section("Key concepts", content.concepts),
      section("Formulas · syntax scan is not mathematical verification", content.formulas),
      section("Worked examples", content.workedExamples),
      section("Revision prompts", content.revisionPrompts),
      references,
    ].filter(Boolean).join("\n");
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = (title.trim().replace(/[^a-z0-9-_]+/gi, "-").replace(/^-|-$/g, "").slice(0, 80) || "chapter-note") + ".md";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <button className="document-action" type="button" onClick={download}>Download note · Markdown</button>;
}
