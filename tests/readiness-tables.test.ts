import { describe, expect, it } from "vitest";
import { REQUIRED_READINESS_TABLES } from "@/lib/health/required-readiness-tables";

describe("required readiness tables", () => {
  it("probes every persisted feature and quota table", () => {
    expect(REQUIRED_READINESS_TABLES).toEqual(expect.arrayContaining([
      "question_solution_mark_schemes",
      "question_classification_history",
      "syllabus_reference_evidence",
      "platform_admins",
      "ai_generation_rate_limits",
      "document_upload_rate_limits",
      "question_web_research_rate_limits",
      "question_web_research_sources",
    ]));
  });

  it("contains no duplicate table probes", () => {
    expect(new Set(REQUIRED_READINESS_TABLES).size).toBe(REQUIRED_READINESS_TABLES.length);
  });
});
