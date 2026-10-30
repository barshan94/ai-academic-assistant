import { parseExamAnswer, type ExamAnswer } from "./answer-schema";

export type AIProviderConfig = {
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
};

export class AIConfigurationError extends Error {
  constructor() {
    super("AI_NOT_CONFIGURED");
    this.name = "AIConfigurationError";
  }
}

export class AIProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIProviderError";
  }
}

export function getAIProviderConfig(env: NodeJS.ProcessEnv = process.env): AIProviderConfig {
  const apiKey = env.AI_API_KEY?.trim();
  const model = env.AI_MODEL?.trim();
  if (!apiKey || !model) throw new AIConfigurationError();

  const baseUrl = (env.AI_API_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/+$/, "");
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    throw new AIConfigurationError();
  }
  if (parsedUrl.protocol !== "https:" && parsedUrl.hostname !== "localhost" && parsedUrl.hostname !== "127.0.0.1") {
    throw new AIConfigurationError();
  }

  return {
    provider: env.AI_PROVIDER_NAME?.trim() || "openai-compatible",
    baseUrl,
    apiKey,
    model,
  };
}

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
};

export async function generateStructuredAnswer(
  questionText: string,
  config: AIProviderConfig = getAIProviderConfig(),
  fetcher: typeof fetch = fetch,
): Promise<ExamAnswer> {
  const question = questionText.trim();
  if (!question || question.length > 20000) throw new AIProviderError("QUESTION_INVALID");

  let response: Response;
  try {
    response = await fetcher(config.baseUrl + "/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + config.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "You are a careful Edexcel, Cambridge O Level/A Level, SSC and HSC academic tutor.",
              "Produce an examination-ready answer in English, followed by clear Bengali and English teaching explanations.",
              "Show calculations and logical working step by step when relevant. Preserve units and significant figures when supplied.",
              "Do not invent missing values, diagrams, mark schemes, syllabus facts or citations.",
              "If the question is ambiguous or missing information, state the assumption and limitation explicitly.",
              "Do not claim that an answer has been independently verified.",
              "Return one valid JSON object only with keys: examAnswer, workingSteps, bengaliExplanation, englishExplanation, keyConcepts, assumptions, limitations.",
              "workingSteps must be an array of objects with step and explanation strings. The other list fields must be arrays of strings.",
            ].join(" "),
          },
          { role: "user", content: "Solve and explain this question:\n\n" + question },
        ],
      }),
      signal: AbortSignal.timeout(45000),
    });
  } catch {
    throw new AIProviderError("AI_PROVIDER_UNAVAILABLE");
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const safeMessage = body.slice(0, 300).replace(/[\r\n\t]+/g, " ");
    throw new AIProviderError("AI_PROVIDER_HTTP_" + response.status + (safeMessage ? ": " + safeMessage : ""));
  }

  let payload: ChatCompletionResponse;
  try {
    payload = await response.json() as ChatCompletionResponse;
  } catch {
    throw new AIProviderError("AI_PROVIDER_INVALID_RESPONSE");
  }

  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new AIProviderError(payload.error?.message || "AI_PROVIDER_EMPTY_RESPONSE");
  }

  try {
    return parseExamAnswer(content);
  } catch {
    throw new AIProviderError("AI_PROVIDER_INVALID_STRUCTURED_ANSWER");
  }
}
