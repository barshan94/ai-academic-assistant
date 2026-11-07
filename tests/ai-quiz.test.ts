import { describe, expect, it, vi } from "vitest";
import { AIProviderError } from "@/lib/ai/provider";
import { generateQuiz, generateQuizWithRouting, parseGeneratedQuiz } from "@/lib/ai/quiz";

const config = { provider: "test", baseUrl: "https://example.test/v1", apiKey: "secret", model: "test-model" };
const source = { ref: "S1", subject: "Physics", chapter: "Forces", questionText: "Define resultant force." };
const validQuiz = {
  title: "Forces practice",
  instructions: "Choose the best answer.",
  questions: [{
    type: "mcq",
    prompt: "What is resultant force?",
    options: ["The vector sum of forces", "Mass times speed", "Work divided by time", "Energy per unit mass"],
    correctAnswer: "The vector sum of forces",
    explanation: "Resultant force is the vector sum of all forces acting on an object.",
    difficulty: "easy",
    sourceRefs: ["S1"],
  }],
};

describe("source-grounded quiz validation", () => {
  it("accepts a valid MCQ tied to a supplied source", () => {
    expect(parseGeneratedQuiz(validQuiz, ["S1"])).toEqual(validQuiz);
  });

  it("rejects unknown source references", () => {
    expect(() => parseGeneratedQuiz({
      ...validQuiz,
      questions: [{ ...validQuiz.questions[0], sourceRefs: ["S2"] }],
    }, ["S1"])).toThrow(new AIProviderError("QUIZ_UNKNOWN_SOURCE"));
  });

  it("rejects duplicate source references rather than implying independent provenance", () => {
    expect(() => parseGeneratedQuiz({
      ...validQuiz,
      questions: [{ ...validQuiz.questions[0], sourceRefs: ["S1", "S1"] }],
    }, ["S1"])).toThrow(new AIProviderError("QUIZ_DUPLICATE_SOURCE"));
  });

  it("rejects MCQs without exactly four distinct options or a matching answer", () => {
    expect(() => parseGeneratedQuiz({
      ...validQuiz,
      questions: [{ ...validQuiz.questions[0], options: ["A", "A", "B", "C"] }],
    }, ["S1"])).toThrow(new AIProviderError("QUIZ_INVALID_MCQ"));
    expect(() => parseGeneratedQuiz({
      ...validQuiz,
      questions: [{ ...validQuiz.questions[0], correctAnswer: "Not an option" }],
    }, ["S1"])).toThrow(new AIProviderError("QUIZ_INVALID_MCQ"));
  });

  it("rejects short-answer questions with MCQ options", () => {
    expect(() => parseGeneratedQuiz({
      ...validQuiz,
      questions: [{ ...validQuiz.questions[0], type: "short_answer" }],
    }, ["S1"])).toThrow(new AIProviderError("QUIZ_INVALID_SHORT_ANSWER"));
  });
});

describe("AI quiz generation", () => {
  it("validates input before contacting the provider", async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(generateQuiz({ subject: "Physics", count: 1, sources: [] }, config, fetcher))
      .rejects.toThrow("QUIZ_INPUT_INVALID");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("sends source material and returns a validated quiz", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify(validQuiz) } }],
    }), { status: 200 }));
    const result = await generateQuiz({ subject: "Physics", chapter: "Forces", count: 1, sources: [source] }, config, fetcher);
    expect(result).toEqual(validQuiz);
    const body = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
    expect(body.messages[1].content).toContain("[S1]");
    expect(body.messages[1].content).toContain("Define resultant force.");
    expect(body.messages[0].content).toContain("Do not claim these questions predict");
  });

  it("rejects a provider response with the wrong question count", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify(validQuiz) } }],
    }), { status: 200 }));
    await expect(generateQuiz({ subject: "Physics", count: 2, sources: [source] }, config, fetcher))
      .rejects.toThrow("QUIZ_QUESTION_COUNT_MISMATCH");
  });

  it("routes only to providers explicitly configured for quiz tasks", async () => {
    const env = {
      AI_ENABLED: "true",
      AI_PROVIDER_POOL: JSON.stringify([
        { name: "answers-only", baseUrl: "https://answers.example/v1", apiKey: "a", model: "m", tasks: ["answer"] },
        { name: "quiz-provider", baseUrl: "https://quiz.example/v1", apiKey: "q", model: "m", tasks: ["quiz"] },
      ]),
    };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify(validQuiz) } }],
    }), { status: 200 }));
    const result = await generateQuizWithRouting({ subject: "Physics", count: 1, sources: [source] }, fetcher, env);
    expect(result.config.provider).toBe("quiz-provider");
    expect(fetcher.mock.calls[0][0]).toBe("https://quiz.example/v1/chat/completions");
  });
});
