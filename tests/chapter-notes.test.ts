import { describe, expect, it, vi } from "vitest";
import { AIProviderError, type AIProviderConfig } from "@/lib/ai/provider";
import { generateChapterNote } from "@/lib/ai/chapter-notes";
import { checkFormulaSyntax } from "@/lib/ai/formula-checks";

const config: AIProviderConfig = {
  provider: "test",
  baseUrl: "https://provider.example/v1",
  apiKey: "test-key",
  model: "test-model",
};

const sources = [{
  ref: "S1",
  questionId: "question-1",
  questionNumber: "1",
  questionText: "Explain Newton's first law.",
  pageId: "page-1",
  pageNumber: 4,
  extractionMethod: "pdf_text",
  pageText: "An object remains at rest or in uniform motion unless acted on by a resultant force.",
}];

function responseWith(content: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("AI chapter note generation", () => {
  it("returns structured notes and accepts citations from supplied sources", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(responseWith(JSON.stringify({
      title: "Newton's first law",
      summary: "An object maintains its state of motion unless acted on by a resultant force [S1].",
      concepts: ["Inertia [S1]"],
      formulas: [],
      workedExamples: ["Identify the resultant force before describing a change in motion [S1]."],
      revisionPrompts: ["State Newton's first law."],
    })));

    const result = await generateChapterNote({
      board: "Cambridge",
      qualification: "O Level",
      subject: "Physics",
      chapter: "Forces",
      sources,
    }, config, fetcher);

    expect(result.title).toBe("Newton's first law");
    expect(fetcher).toHaveBeenCalledOnce();
    const request = JSON.parse(String(fetcher.mock.calls[0][1]?.body)) as {
      messages: Array<{ content: string }>;
    };
    expect(request.messages[1].content).toContain("[S1]");
  });

  it("rejects citation labels that were not supplied", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(responseWith(JSON.stringify({
      title: "Newton's first law",
      summary: "A claim with a fabricated citation [S9].",
      concepts: [],
      formulas: [],
      workedExamples: [],
      revisionPrompts: [],
    })));

    await expect(generateChapterNote({
      board: "Cambridge",
      qualification: "O Level",
      subject: "Physics",
      chapter: "Forces",
      sources,
    }, config, fetcher)).rejects.toMatchObject({ message: "CHAPTER_NOTE_UNKNOWN_CITATION" });
  });

  it("rejects an empty source set before calling the provider", async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(generateChapterNote({
      board: "Cambridge",
      qualification: "O Level",
      subject: "Physics",
      chapter: "Forces",
      sources: [],
    }, config, fetcher)).rejects.toBeInstanceOf(AIProviderError);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects duplicate or malformed source references before calling the provider", async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(generateChapterNote({
      board: "Cambridge",
      qualification: "O Level",
      subject: "Physics",
      chapter: "Forces",
      sources: [{ ...sources[0], ref: "S1" }, { ...sources[0], ref: "S1" }],
    }, config, fetcher)).rejects.toMatchObject({ message: "CHAPTER_NOTE_SOURCE_INVALID" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects invalid source page metadata", async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(generateChapterNote({
      board: "Cambridge",
      qualification: "O Level",
      subject: "Physics",
      chapter: "Forces",
      sources: [{ ...sources[0], pageNumber: 0 }],
    }, config, fetcher)).rejects.toMatchObject({ message: "CHAPTER_NOTE_SOURCE_INVALID" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects malformed or fabricated citation tokens in every note field", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(responseWith(JSON.stringify({
      title: "Newton's first law [S9]",
      summary: "An object maintains its state of motion.",
      concepts: [],
      formulas: [],
      workedExamples: [],
      revisionPrompts: [],
    })));

    await expect(generateChapterNote({
      board: "Cambridge",
      qualification: "O Level",
      subject: "Physics",
      chapter: "Forces",
      sources,
    }, config, fetcher)).rejects.toMatchObject({ message: "CHAPTER_NOTE_UNKNOWN_CITATION" });
  });

  it("rejects malformed or truncated citation markers instead of silently accepting them", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(responseWith(JSON.stringify({
      title: "Newton's first law",
      summary: "An object maintains its state of motion [S1].",
      concepts: ["Inertia [ S1 ]"],
      formulas: [],
      workedExamples: ["Identify the resultant force [S1]."],
      revisionPrompts: ["State Newton's first law [S1."],
    })));

    await expect(generateChapterNote({
      board: "Cambridge",
      qualification: "O Level",
      subject: "Physics",
      chapter: "Forces",
      sources,
    }, config, fetcher)).rejects.toMatchObject({ message: "CHAPTER_NOTE_UNKNOWN_CITATION" });
  });

  it("rejects lowercase citation tokens even when a valid uppercase citation is also present", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(responseWith(JSON.stringify({
      title: "Newton's first law",
      summary: "An object maintains its state of motion [S1].",
      concepts: ["Inertia [S1] and a malformed lowercase marker [s1]."],
      formulas: [],
      workedExamples: ["Identify the resultant force [S1]."],
      revisionPrompts: [],
    })));

    await expect(generateChapterNote({
      board: "Cambridge",
      qualification: "O Level",
      subject: "Physics",
      chapter: "Forces",
      sources,
    }, config, fetcher)).rejects.toMatchObject({ message: "CHAPTER_NOTE_UNKNOWN_CITATION" });
  });

  it("requires citations on summaries, concepts, formulas and worked examples", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(responseWith(JSON.stringify({
      title: "Newton's first law",
      summary: "An object maintains its state of motion [S1].",
      concepts: ["Inertia [S1]"],
      formulas: ["F = ma"],
      workedExamples: ["Identify the resultant force [S1]."],
      revisionPrompts: ["State Newton's first law."],
    })));

    await expect(generateChapterNote({
      board: "Cambridge",
      qualification: "O Level",
      subject: "Physics",
      chapter: "Forces",
      sources,
    }, config, fetcher)).rejects.toMatchObject({ message: "CHAPTER_NOTE_CITATION_INCOMPLETE" });
  });

  it("rejects malformed structured output", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(responseWith("{not-json"));
    await expect(generateChapterNote({
      board: "Cambridge",
      qualification: "O Level",
      subject: "Physics",
      chapter: "Forces",
      sources,
    }, config, fetcher)).rejects.toMatchObject({ message: "AI_PROVIDER_INVALID_CHAPTER_NOTE" });
  });
});

describe("conservative formula syntax checks", () => {
  it("accepts a simple conventional formula without claiming mathematical verification", () => {
    expect(checkFormulaSyntax("F = ma")).toEqual({ checked: true, warnings: [] });
  });

  it("flags unmatched brackets and incomplete operator endings", () => {
    const result = checkFormulaSyntax("F = m(a +");
    expect(result.warnings).toContain("One or more brackets are not closed.");
    expect(result.warnings).toContain("The expression starts or ends with an operator; check whether it is incomplete.");
  });

  it("flags suspicious adjacent operators and multiple equality signs", () => {
    const result = checkFormulaSyntax("a ++ b = c = d");
    expect(result.warnings).toContain("Adjacent arithmetic operators detected; check the operator sequence.");
    expect(result.warnings).toContain("More than one equals sign; check whether this is an intended equation chain.");
  });
});
