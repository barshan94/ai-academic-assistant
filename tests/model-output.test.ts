import { describe, expect, it } from "vitest";
import { parseAssistantOutput } from "@/lib/ai/model-output";

describe("assistant output parsing", () => {
  it("preserves nullable classification metadata from JSON", () => {
    const result = parseAssistantOutput(JSON.stringify({
      answer: "A sufficiently detailed answer for this classification request.",
      subject: "Physics",
      qualification: null,
      chapter: "Forces",
      topic: null,
      confidence: null,
    }));
    expect(result.subject).toBe("Physics");
    expect(result.qualification).toBeNull();
    expect(result.topic).toBeNull();
    expect(result.confidence).toBeNull();
  });

  it("accepts fenced JSON from compatible providers", () => {
    const result = parseAssistantOutput('```json\n{"answer":"A sufficiently detailed answer returned by the model."}\n```');
    expect(result.answer).toContain("sufficiently detailed");
  });

  it("keeps plain-text provider answers usable", () => {
    const raw = "A plain-text explanation that is long enough to be useful.";
    expect(parseAssistantOutput(raw)).toEqual({ answer: raw });
  });

  it("does not trust invalid confidence values", () => {
    const result = parseAssistantOutput(JSON.stringify({
      answer: "A sufficiently detailed answer for this classification request.",
      confidence: 1.5,
      subject: "Physics",
    }));
    expect(result).toEqual({ answer: JSON.stringify({
      answer: "A sufficiently detailed answer for this classification request.",
      confidence: 1.5,
      subject: "Physics",
    }) });
    expect(result).not.toHaveProperty("subject");
  });

  it("bounds fallback text to the output limit", () => {
    const result = parseAssistantOutput("x".repeat(31000));
    expect(result.answer).toHaveLength(30000);
  });
});
