import { describe, expect, it } from "vitest";
import { buildChapterNoteMarkdown, chapterNoteMarkdownFilename } from "@/lib/notes/chapter-note-export";

describe("chapter note Markdown export", () => {
  it("exports all note sections and preserves source reference metadata", () => {
    const markdown = buildChapterNoteMarkdown("Forces & motion", {
      summary: "An object maintains its state of motion [S1].",
      concepts: ["Inertia [S1]"],
      formulas: ["F = ma [S1]"],
      workedExamples: ["Identify the resultant force [S1]."],
      revisionPrompts: ["State Newton's first law."],
      generatedBy: "ai",
      sourceReferences: [{
        ref: "S1",
        questionId: "question-123",
        pageId: "page-456",
        pageNumber: 4,
        extractionMethod: "pdf_text",
      }],
    });

    expect(markdown).toContain("# Forces & motion");
    expect(markdown).toContain("AI-generated draft. Not independently verified.");
    expect(markdown).toContain("## Summary");
    expect(markdown).toContain("## Key concepts");
    expect(markdown).toContain("## Formulas");
    expect(markdown).toContain("## Worked examples");
    expect(markdown).toContain("## Revision prompts");
    expect(markdown).toContain("[S1] Question ID: question-123 · Page ID: page-456 · Page 4 · Extraction: pdf_text");
  });

  it("labels free offline extraction honestly and preserves generation provenance", () => {
    const markdown = buildChapterNoteMarkdown("Forces", {
      generatedBy: "offline-extractive",
      generationProvider: "local-no-api",
      generationModel: "deterministic-source-extraction-v1",
      verificationStatus: "not_independently_verified",
    });
    expect(markdown).toContain("Free offline source-extraction draft.");
    expect(markdown).toContain("does not generate explanations or solve questions");
    expect(markdown).toContain("- Provider: local-no-api");
    expect(markdown).toContain("- Model: deterministic-source-extraction-v1");
    expect(markdown).toContain("- Verification status: not_independently_verified");
    expect(markdown).not.toContain("Owner-authored study note.");
  });

  it("marks manually authored notes distinctly", () => {
    expect(buildChapterNoteMarkdown("My note", { generatedBy: "owner-authored" })).toContain("Owner-authored study note.");
    expect(buildChapterNoteMarkdown("My note", {})).not.toContain("AI-generated draft.");
  });

  it("omits empty sections and source references", () => {
    const markdown = buildChapterNoteMarkdown("Empty note", { concepts: [], formulas: [], sourceReferences: [] });
    expect(markdown).not.toContain("## Key concepts");
    expect(markdown).not.toContain("## Source references");
  });

  it("creates a safe filename and falls back for blank titles", () => {
    expect(chapterNoteMarkdownFilename("  Forces & Motion / Part 1  ")).toBe("Forces-Motion-Part-1.md");
    expect(chapterNoteMarkdownFilename("!!!")).toBe("chapter-note.md");
    expect(chapterNoteMarkdownFilename("A".repeat(100))).toBe("A".repeat(80) + ".md");
  });
});
