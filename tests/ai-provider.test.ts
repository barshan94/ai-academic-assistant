import { describe, expect, it, vi } from "vitest";
import {
  AIConfigurationError,
  AIProviderError,
  generateStructuredAnswer,
  generateStructuredAnswerWithRouting,
  getAIProviderConfig,
  getAIProviderConfigs,
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
  tips: [],
  shortcuts: [],
  alternativeMethods: [],
  commonMistakes: [],
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
  it("keeps provider calls disabled unless AI_ENABLED is explicitly true", () => {
    expect(() => getAIProviderConfig({ AI_API_KEY: "key", AI_MODEL: "model" })).toThrow(AIConfigurationError);
    expect(() => getAIProviderConfig({ AI_ENABLED: "false", AI_API_KEY: "key", AI_MODEL: "model" })).toThrow(AIConfigurationError);
  });

  it("rejects insecure non-local provider URLs", () => {
    expect(() => getAIProviderConfig({
      AI_ENABLED: "true",
      AI_API_KEY: "secret",
      AI_MODEL: "model",
      AI_API_BASE_URL: "http://example.com/v1",
    })).toThrow(AIConfigurationError);
  });
});

describe("task-aware provider selection", () => {
  it("filters by task, excludes disabled providers and orders by explicit priority", () => {
    const providers = getAIProviderConfigs("answer", {
      AI_ENABLED: "true",
      AI_PROVIDER_POOL: JSON.stringify([
        { name: "notes-only", baseUrl: "https://notes.example/v1", apiKey: "notes-key", model: "notes-model", tasks: ["chapter-note"], priority: 0 },
        { name: "later", baseUrl: "https://later.example/v1", apiKey: "later-key", model: "later-model", tasks: ["answer"], priority: 20 },
        { name: "disabled", baseUrl: "https://disabled.example/v1", apiKey: "disabled-key", model: "disabled-model", tasks: ["answer"], priority: 1, enabled: false },
        { name: "first", baseUrl: "https://first.example/v1", apiKey: "first-key", model: "first-model", tasks: ["answer", "chapter-note"], priority: 5 },
      ]),
    });

    expect(providers.map((provider) => provider.provider)).toEqual(["first", "later"]);
  });

  it("fails closed for malformed pools and insecure provider endpoints", () => {
    expect(() => getAIProviderConfigs("answer", { AI_ENABLED: "true", AI_PROVIDER_POOL: "{broken" }))
      .toThrow(AIConfigurationError);
    expect(() => getAIProviderConfigs("answer", {
      AI_ENABLED: "true",
      AI_PROVIDER_POOL: JSON.stringify([
        { name: "insecure", baseUrl: "http://provider.example/v1", apiKey: "key", model: "model", tasks: ["answer"] },
      ]),
    })).toThrow(AIConfigurationError);
  });

  it("keeps the legacy single-provider configuration compatible", () => {
    const [provider] = getAIProviderConfigs("answer", {
      AI_ENABLED: "true",
      AI_API_KEY: "legacy-key",
      AI_MODEL: "legacy-model",
      AI_API_BASE_URL: "https://legacy.example/v1",
    });
    expect(provider).toMatchObject({
      provider: "openai-compatible",
      baseUrl: "https://legacy.example/v1",
      apiKey: "legacy-key",
      model: "legacy-model",
    });
  });

  it("accepts Google's OpenAI-compatible Gemini endpoint on the existing adapter", () => {
    const [provider] = getAIProviderConfigs("answer", {
      AI_ENABLED: "true",
      AI_PROVIDER_NAME: "gemini-ai-studio",
      AI_API_BASE_URL: "https://generativelanguage.googleapis.com/v1beta/openai",
      AI_API_KEY: "server-side-gemini-key",
      AI_MODEL: "gemini-3.6-flash",
    });

    expect(provider).toMatchObject({
      provider: "gemini-ai-studio",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      model: "gemini-3.6-flash",
    });
    expect(provider.apiKey).toBe("server-side-gemini-key");
  });
});

describe("AI provider fallback policy", () => {
  const pool = JSON.stringify([
    { name: "primary", baseUrl: "https://primary.example/v1", apiKey: "primary-key", model: "primary-model", tasks: ["answer"], priority: 1 },
    { name: "secondary", baseUrl: "https://secondary.example/v1", apiKey: "secondary-key", model: "secondary-model", tasks: ["answer"], priority: 2 },
  ]);
  const env = { AI_ENABLED: "true", AI_PROVIDER_POOL: pool, AI_ALLOW_PROVIDER_FALLBACKS: "true" };

  it("does not retry permanent authentication or request errors", async () => {
    for (const status of [400, 401, 403, 404, 413, 422]) {
      const fetcher = vi.fn<typeof fetch>()
        .mockResolvedValueOnce(new Response("provider error", { status }))
        .mockResolvedValueOnce(new Response(JSON.stringify({
          choices: [{ message: { content: JSON.stringify(validAnswer) } }],
        }), { status: 200 }));

      await expect(generateStructuredAnswerWithRouting("Question", fetcher, {}, env))
        .rejects.toThrow("AI_PROVIDER_HTTP_" + status);
      expect(fetcher).toHaveBeenCalledOnce();
    }
  });

  it("tries the next provider after a transient server failure", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("temporary outage", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify(validAnswer) } }],
      }), { status: 200 }));

    const result = await generateStructuredAnswerWithRouting("Question", fetcher, {}, env);
    expect(result.answer).toEqual(validAnswer);
    expect(result.config.provider).toBe("secondary");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("tries the next provider after a network failure without exposing the transport error", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockRejectedValueOnce(new Error("private socket details"))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify(validAnswer) } }],
      }), { status: 200 }));

    const result = await generateStructuredAnswerWithRouting("Question", fetcher, {}, env);
    expect(result.answer).toEqual(validAnswer);
    expect(result.config.provider).toBe("secondary");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("tries the next provider after malformed structured output", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: "{malformed private output" } }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify(validAnswer) } }],
      }), { status: 200 }));

    const result = await generateStructuredAnswerWithRouting("Question", fetcher, {}, env);
    expect(result.answer).toEqual(validAnswer);
    expect(result.config.provider).toBe("secondary");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("bounds provider fallback time and leaves room to persist the answer", async () => {
    const manyProviders = JSON.stringify(Array.from({ length: 8 }, (_, index) => ({
      name: "provider-" + index,
      baseUrl: "https://provider-" + index + ".example/v1",
      apiKey: "test-key",
      model: "test-model",
      tasks: ["answer"],
      priority: index,
    })));
    let now = 0;
    const nowSpy = vi.spyOn(Date, "now").mockImplementation(() => now);
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
      now += 20_000;
      return new Response("temporary outage", { status: 503 });
    });

    try {
      await expect(generateStructuredAnswerWithRouting("Question", fetcher, {}, {
        AI_ENABLED: "true",
        AI_PROVIDER_POOL: manyProviders,
        AI_ALLOW_PROVIDER_FALLBACKS: "true",
      })).rejects.toThrow("AI_PROVIDER_HTTP_503");
      expect(fetcher).toHaveBeenCalledTimes(2);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("does not retry when fallback is not explicitly enabled", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("temporary outage", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify(validAnswer) } }],
      }), { status: 200 }));

    await expect(generateStructuredAnswerWithRouting("Question", fetcher, {}, {
      AI_ENABLED: "true",
      AI_PROVIDER_POOL: pool,
    })).rejects.toThrow("AI_PROVIDER_HTTP_503");
    expect(fetcher).toHaveBeenCalledOnce();
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
    expect(init?.redirect).toBe("error");
    const body = JSON.parse(String(init?.body));
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages[1].content).toContain("Edexcel");
    expect(body.messages[1].content).toContain("No source page text was shared.");
  });

  it("includes explicitly supplied source text when opted in", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify(validAnswer) } }],
    }), { status: 200 }));
    await generateStructuredAnswer("Question", config, fetcher, {
      sourceContext: { pageNumber: 4, extractionMethod: "ocr", text: "A corrected source passage." },
    });
    const body = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
    expect(body.messages[1].content).toContain("Page 4 (ocr)");
    expect(body.messages[1].content).toContain("A corrected source passage.");
    expect(body.messages[0].content).toContain("may contain OCR or extraction errors");
  });

  it("rejects invalid source context before contacting the provider", async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(generateStructuredAnswer("Question", config, fetcher, {
      sourceContext: { pageNumber: 1, extractionMethod: "ocr", text: " " },
    })).rejects.toThrow("SOURCE_CONTEXT_INVALID");
    await expect(generateStructuredAnswer("Question", config, fetcher, {
      sourceContext: { pageNumber: 1, extractionMethod: "ocr", text: "x".repeat(8001) },
    })).rejects.toThrow("SOURCE_CONTEXT_INVALID");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("does not accept malformed provider output", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: "{not-json" } }],
    }), { status: 200 }));

    await expect(generateStructuredAnswer("Question", config, fetcher))
      .rejects.toThrow(new AIProviderError("AI_PROVIDER_INVALID_STRUCTURED_ANSWER"));
  });

  it("converts empty and provider-error payloads into a generic error without leaking upstream messages", async () => {
    for (const payload of [
      { choices: [{ message: { content: "" } }] },
      { error: { message: "private provider diagnostic and echoed prompt" } },
    ]) {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify(payload), { status: 200 }),
      );
      await expect(generateStructuredAnswer("Question", config, fetcher))
        .rejects.toThrow("AI_PROVIDER_EMPTY_RESPONSE");
    }
  });

  it("converts provider HTTP failures into status-only errors without exposing response bodies", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("provider failure; echoed prompt and private payload", { status: 503 }),
    );
    let thrown: unknown;
    try {
      await generateStructuredAnswer("Question", config, fetcher);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(AIProviderError);
    expect((thrown as Error).message).toBe("AI_PROVIDER_HTTP_503");
    expect((thrown as Error).message).not.toContain("private payload");
  });

  it("rejects oversized or empty questions before contacting the provider", async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(generateStructuredAnswer("   ", config, fetcher)).rejects.toThrow("QUESTION_INVALID");
    await expect(generateStructuredAnswer("x".repeat(20001), config, fetcher)).rejects.toThrow("QUESTION_INVALID");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
