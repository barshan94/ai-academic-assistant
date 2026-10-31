import { describe, expect, it } from "vitest";
import { rankSyllabusTextMatches } from "@/lib/questions/syllabus-matcher";

describe("syllabus text-match suggestions", () => {
  const candidates = [
    { id: "forces", title: "Forces and motion" },
    { id: "energy", title: "Energy resources" },
    { id: "electricity", title: "Electric circuits" },
  ];

  it("ranks labels with more meaningful shared terms first", () => {
    const result = rankSyllabusTextMatches(
      "Explain how forces affect the motion of an object.",
      candidates,
    );
    expect(result[0].id).toBe("forces");
    expect(result[0].matchedTerms).toEqual(["forces", "motion"]);
  });

  it("reports the lexical reason and exact phrase match", () => {
    const result = rankSyllabusTextMatches("Describe energy resources.", candidates);
    expect(result[0].id).toBe("energy");
    expect(result[0].reasons).toContain("The full catalogue label appears in the question text");
  });

  it("prioritizes an exact syllabus section-code match and explains why", () => {
    const result = rankSyllabusTextMatches("Use section 4.2.1 to answer the question.", [
      { id: "wrong", title: "Electric circuits", code: "4.3.2" },
      { id: "right", title: "Electrical charge", code: "4.2.1" },
    ]);
    expect(result[0]?.id).toBe("right");
    expect(result[0]?.reasons).toContain("The syllabus section code appears in the question text");
  });

  it("does not suggest a candidate from generic instruction words alone", () => {
    expect(rankSyllabusTextMatches("Explain and describe the answer.", candidates)).toEqual([]);
  });

  it("returns no suggestions for empty text and respects the result limit", () => {
    expect(rankSyllabusTextMatches("", candidates)).toEqual([]);
    expect(rankSyllabusTextMatches("forces motion energy resources", candidates, 1)).toHaveLength(1);
  });

  it("supports Bengali Unicode terms", () => {
    const result = rankSyllabusTextMatches("বল এবং গতি সম্পর্কে ব্যাখ্যা করো", [
      { id: "motion", title: "বল ও গতি" },
      { id: "waves", title: "তরঙ্গ" },
    ]);
    expect(result[0]?.id).toBe("motion");
    expect(result[0]?.matchedTerms).toContain("গতি");
  });
});
