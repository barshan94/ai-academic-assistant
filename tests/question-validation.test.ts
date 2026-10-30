import { describe, expect, it } from "vitest";
import { questionCreateSchema } from "@/lib/questions/validation";

const validInput = {
  documentId: "00000000-0000-4000-8000-000000000001",
  documentPageId: "00000000-0000-4000-8000-000000000002",
  questionText: "  Explain the principle of moments.  ",
  questionNumber: " 3(b) ",
  board: " Cambridge ",
  qualification: " O Level ",
  subject: " Physics ",
  chapter: "",
  topic: " Moments ",
};

describe("question capture validation", () => {
  it("trims question content and optional metadata", () => {
    const result = questionCreateSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.questionText).toBe("Explain the principle of moments.");
    expect(result.data.questionNumber).toBe("3(b)");
    expect(result.data.board).toBe("Cambridge");
    expect(result.data.chapter).toBeNull();
  });

  it("rejects empty question text", () => {
    expect(questionCreateSchema.safeParse({ ...validInput, questionText: "   " }).success).toBe(false);
  });

  it("rejects invalid source identifiers", () => {
    expect(questionCreateSchema.safeParse({ ...validInput, documentPageId: "not-a-uuid" }).success).toBe(false);
  });

  it("rejects question text above the storage limit", () => {
    expect(questionCreateSchema.safeParse({ ...validInput, questionText: "x".repeat(20001) }).success).toBe(false);
  });
});
