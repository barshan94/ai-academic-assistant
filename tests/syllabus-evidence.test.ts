import { describe, expect, it } from "vitest";
import { parseSyllabusEvidenceInput } from "@/lib/questions/syllabus-evidence";

const valid = {
  catalogId: "11111111-1111-4111-8111-111111111111",
  chapterId: "22222222-2222-4222-8222-222222222222",
  topicId: "33333333-3333-4333-8333-333333333333",
  sourceUrl: "https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification.pdf",
  sourceTitle: "International GCSE Physics specification",
  sourceLocator: "Section 2.3, page 18",
  evidenceExcerpt: "The specification describes the required topic content.",
};

describe("syllabus source evidence input", () => {
  it("accepts a well-formed HTTPS citation", () => {
    expect(parseSyllabusEvidenceInput(valid).success).toBe(true);
  });

  it("rejects HTTP and malformed URLs", () => {
    expect(parseSyllabusEvidenceInput({ ...valid, sourceUrl: "http://example.com/spec.pdf" }).success).toBe(false);
    expect(parseSyllabusEvidenceInput({ ...valid, sourceUrl: "not a URL" }).success).toBe(false);
  });

  it("requires a non-empty source title and valid parent IDs", () => {
    expect(parseSyllabusEvidenceInput({ ...valid, sourceTitle: "  " }).success).toBe(false);
    expect(parseSyllabusEvidenceInput({ ...valid, chapterId: "not-a-uuid" }).success).toBe(false);
  });

  it("enforces locator and excerpt length limits", () => {
    expect(parseSyllabusEvidenceInput({ ...valid, sourceLocator: "x".repeat(201) }).success).toBe(false);
    expect(parseSyllabusEvidenceInput({ ...valid, evidenceExcerpt: "x".repeat(601) }).success).toBe(false);
  });

  it("allows chapter-level evidence without a topic ID", () => {
    expect(parseSyllabusEvidenceInput({ ...valid, topicId: "" }).success).toBe(true);
  });
});
