import { describe, expect, it, vi } from "vitest";
import {
  AIConfigurationError,
  AIProviderError,
  generateStructuredAnswer,
  getAIProviderConfig,
} from "@/lib/ai/provider";
import { parseExamAnswer } from "@/lib/ai/answer-schema";

const validAnswer = {
  examAnswer: "The resultant moment is zero.",
  workingSteps: [{ step: "1", explanation: "Clockwise moment equals anticlockwise moment." }],
  calculationChecks: [{ expression: "5 * 2", claimedResult: 10, unit: "Nm" }],
  chemistryChecks: [],
  physicsChecks: [{ formulaUnit: "kg*m/s^2", claimedUnit: "N" }],
  bengaliExplanation: "ঘড়ির কাঁটার দিকে ও বিপরীত দিকের মোট মুহূর্ত সমান।",
  englishExplanation: "The turning effects balance.",
  keyConcepts: ["Principle of moments"],
  assumptions: [],
  limitations: [],
};

const config = {
  provider: "test-provider",
  baseUrl: "https://example.test/v1",
  apiKey: "test-key",
  model: "test-model",
};

describe("AI provider configuration", () => {
  it("requires an API key and model before making paid requests", () => {
    expect(() => getAIProviderConfig({})).toThrow(AIConfigurationError);
  });

  it("rejects insecure non-local provider URLs", () => {
    expect(() => getAIProviderConfig({
      AI_API_KEY: "secret",
      AI_MODEL: "model",
      AI_API_BASE_URL: "http://example.com/v1",
    })).toThrow(AIConfigurationError);
  });
});

describe("structured exam answer generation", () => {
  it("parses a valid structured answer", () => {
    expect(parseExamAnswer(JSON.stringify(validAnswer))).toEqual(validAnswer);
  });

  it("accepts a JSON code fence but rejects incomplete answer fields", () => {
    expect(parseExamAnswer("```json\n" + JSON.stringify(validAnswer) + "\n```")).toEqual(validAnswer);
    expect(() => parseExamAnswer(JSON.stringify({ examAnswer: "Only an answer" }))).toThrow();
  });

  it("sends a bounded structured request and returns the validated result", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify(validAnswer) } }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const result = await generateStructuredAnswer("Explain the principle of moments.", config, fetcher, {
      board: "Edexcel",
      qualification: "A Level",
      subject: "Physics",
    });

    expect(result).toEqual(validAnswer);
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("https://example.test/v1/chat/completions");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
    const body = JSON.parse(String(init?.body));
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages[1].content).toContain("Edexcel");
  });

  it("does not accept malformed provider output", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: "{not-json" } }],
    }), { status: 200 }));

    await expect(generateStructuredAnswer("Question", config, fetcher))
      .rejects.toThrow(new AIProviderError("AI_PROVIDER_INVALID_STRUCTURED_ANSWER"));
  });

  it("converts provider HTTP failures into bounded errors", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("provider failure", { status: 503 }));
    await expect(generateStructuredAnswer("Question", config, fetcher))
      .rejects.toThrow("AI_PROVIDER_HTTP_503");
  });

  it("rejects oversized or empty questions before contacting the provider", async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(generateStructuredAnswer("   ", config, fetcher)).rejects.toThrow("QUESTION_INVALID");
    await expect(generateStructuredAnswer("x".repeat(20001), config, fetcher)).rejects.toThrow("QUESTION_INVALID");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
