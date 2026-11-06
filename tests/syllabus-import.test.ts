import { describe, expect, it } from "vitest";
import { parseSyllabusImportText, syllabusImportSchema } from "@/lib/questions/syllabus-import";

const validImport = {
  formatVersion: 1,
  catalog: {
    board: "Pearson Edexcel",
    qualification: "International GCSE",
    subject: "Physics",
    version: "4PH1 (2025–2027)",
    effectiveFrom: "2025-09-01",
    effectiveTo: "2027-08-31",
    sourceUrl: "https://qualifications.pearson.com/example-specification.pdf",
    sourceTitle: "Illustrative source title",
  },
  chapters: [
    {
      code: "1",
      title: "Forces and motion",
      sortOrder: 1,
      topics: [
        { code: "1.1", title: "Units", sortOrder: 1 },
        { code: "1.2", title: "Scalars and vectors", sortOrder: 2 },
      ],
    },
  ],
};

describe("versioned syllabus JSON import", () => {
  it("accepts a valid versioned import and defaults omitted topic arrays", () => {
    const result = syllabusImportSchema.safeParse({
      ...validImport,
      chapters: [{ title: "Energy" }],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.chapters[0].topics).toEqual([]);
  });

  it("requires an HTTPS source URL", () => {
    expect(syllabusImportSchema.safeParse({
      ...validImport,
      catalog: { ...validImport.catalog, sourceUrl: "http://example.com/spec.pdf" },
    }).success).toBe(false);
  });

  it("rejects invalid effective date ranges", () => {
    expect(syllabusImportSchema.safeParse({
      ...validImport,
      catalog: { ...validImport.catalog, effectiveFrom: "2027-01-01", effectiveTo: "2026-01-01" },
    }).success).toBe(false);
  });

  it("rejects duplicate chapter titles without regard to case", () => {
    expect(syllabusImportSchema.safeParse({
      ...validImport,
      chapters: [
        { title: "Forces", topics: [] },
        { title: "forces", topics: [] },
      ],
    }).success).toBe(false);
  });

  it("rejects duplicate topic titles within one chapter", () => {
    expect(syllabusImportSchema.safeParse({
      ...validImport,
      chapters: [{
        title: "Forces",
        topics: [{ title: "Moments" }, { title: "moments" }],
      }],
    }).success).toBe(false);
  });

  it("rejects unsupported format versions and unknown fields", () => {
    expect(syllabusImportSchema.safeParse({ ...validImport, formatVersion: 2 }).success).toBe(false);
    expect(syllabusImportSchema.safeParse({ ...validImport, unexpected: true }).success).toBe(false);
  });

  it("rejects malformed JSON with a useful error", () => {
    const result = parseSyllabusImportText("{broken");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("valid JSON");
  });

  it("rejects oversized import documents before parsing", () => {
    const result = parseSyllabusImportText(" ".repeat(512_001));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("512 KB");
  });

  it("accepts the example payload", () => {
    expect(parseSyllabusImportText(JSON.stringify(validImport)).success).toBe(true);
  });
});
