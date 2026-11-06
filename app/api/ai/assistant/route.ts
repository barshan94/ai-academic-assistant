import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkExplicitArithmetic, getVerificationLabel } from "@/lib/ai/arithmetic-check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  task: z.enum(["solve", "classify", "chapter_notes", "revision_set"]),
  questionId: z.string().uuid().optional(),
  questionText: z.string().trim().min(5).max(12000).optional(),
  subject: z.string().trim().max(100).optional(),
  chapter: z.string().trim().max(150).optional(),
  language: z.enum(["english", "bengali", "both"]).default("both"),
  count: z.number().int().min(3).max(20).default(8),
});

const outputSchema = z.object({
  answer: z.string().min(20).max(30000),
  subject: z.string().max(100).optional(),
  qualification: z.string().max(100).optional(),
  chapter: z.string().max(150).optional(),
  topic: z.string().max(150).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

const instructions: Record<z.infer<typeof requestSchema>["task"], string> = {
  solve: "Solve the academic question rigorously. Give an exam-ready answer, show each reasoning step, define symbols, include units, and explain common mistakes. Never invent missing data. If ambiguous, state assumptions and ask for the missing information. Separate Bengali teaching explanation from the English exam answer when both are requested.",
  classify: "Classify the question for Edexcel/Cambridge O Level/A Level or Bangladesh SSC/HSC when evidence supports it. Return only evidence-supported subject, qualification, chapter and topic; use null for uncertain fields. Do not guess a board or syllabus.",
  chapter_notes: "Create concise, structured chapter notes from the supplied source questions only. Cover core concepts, definitions, formulas, worked examples, misconceptions and a short recap. Explicitly mark gaps where the source material is insufficient.",
  revision_set: "Create a revision set based only on the supplied questions. Include a balanced mix of recall, application and challenging questions, then provide a separate answer key and marking points. Do not claim syllabus completeness.",
};

function extractText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const record = payload as { choices?: Array<{ message?: { content?: unknown } }> };
  const content = record.choices?.[0]?.message?.content;
  return typeof content === "string" ? content : "";
}

function parseModelOutput(raw: string) {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    const parsed: unknown = JSON.parse(cleaned);
    const result = outputSchema.safeParse(parsed);
    if (result.success) return result.data;
  } catch { /* Use the provider's plain-text answer below. */ }
  return { answer: raw };
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request. Check the question and options." }, { status: 400 });
  }

  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;
  const endpoint = process.env.AI_BASE_URL;
  if (!apiKey || !model || !endpoint) {
    return NextResponse.json({
      error: "AI provider is not configured. Add a compatible provider's AI_BASE_URL, AI_API_KEY and AI_MODEL to the server environment. Use a provider with a free quota; this app does not enable paid inference automatically.",
      code: "AI_PROVIDER_NOT_CONFIGURED",
    }, { status: 503 });
  }

  let questionText = body.questionText ?? "";
  let context = "";
  if (body.questionId && (body.task === "solve" || body.task === "classify")) {
    const { data: question, error } = await supabase.from("questions")
      .select("question_text,subject,qualification,chapter,topic,review_status")
      .eq("id", body.questionId).eq("owner_id", user.id).maybeSingle();
    if (error || !question) return NextResponse.json({ error: "Question not found in your library." }, { status: 404 });
    questionText = question.question_text;
    context = [question.subject, question.qualification, question.chapter, question.topic].filter(Boolean).join(" · ");
  }

  if ((body.task === "solve" || body.task === "classify") && questionText.length < 5) {
    return NextResponse.json({ error: "Select a saved question or provide the question text for this task." }, { status: 400 });
  }

  if (body.task === "chapter_notes" && (!body.subject || !body.chapter)) {
    return NextResponse.json({ error: "Choose both a subject and chapter so notes do not mix unrelated topics." }, { status: 400 });
  }
  if (body.task === "revision_set" && !body.subject) {
    return NextResponse.json({ error: "Choose a subject for a focused revision set." }, { status: 400 });
  }

  let sourceQuestions: string[] = [];
  if (body.task === "chapter_notes" || body.task === "revision_set") {
    let query = supabase.from("questions").select("question_text,subject,chapter,topic")
      .eq("owner_id", user.id).eq("review_status", "approved");
    if (body.subject) query = query.eq("subject", body.subject);
    if (body.chapter) query = query.eq("chapter", body.chapter);
    const { data, error } = await query.order("created_at", { ascending: false }).limit(30);
    if (error) return NextResponse.json({ error: "Could not load approved source questions." }, { status: 500 });
    sourceQuestions = (data ?? []).map((item) => item.question_text);
    if (!sourceQuestions.length) return NextResponse.json({ error: "Approve relevant source questions first. Generated notes must be grounded in your reviewed library." }, { status: 422 });
  }

  const language = body.language === "both" ? "Provide the exam answer in English and a teaching explanation in Bengali."
    : body.language === "bengali" ? "Write the complete explanation in Bengali script." : "Write in English.";
  const taskInput = body.task === "solve" ? questionText
    : body.task === "classify" ? questionText
    : sourceQuestions.map((text, index) => `${index + 1}. ${text}`).join("\n");
  const prompt = [
    instructions[body.task],
    language,
    "Academic context: " + (context || [body.subject, body.chapter].filter(Boolean).join(" · ") || "Not supplied"),
    body.task === "revision_set" ? `Create ${body.count} questions.` : "",
    "Return valid JSON only: {\"answer\":\"...\",\"subject\":\"...\",\"qualification\":\"...\",\"chapter\":\"...\",\"topic\":\"...\",\"confidence\":0.0}. For non-classification tasks only answer is required.",
    "Input:\n" + taskInput,
  ].filter(Boolean).join("\n\n");

  const quotaBucket = body.task === "chapter_notes" || body.task === "revision_set" ? "ai-chapter-note" : "ai-solution";
  const { data: quotaAllowed, error: quotaError } = await supabase.rpc("consume_ai_generation_quota", { p_bucket: quotaBucket });
  if (quotaError) return NextResponse.json({ error: "AI quota service is unavailable. Try again later." }, { status: 503 });
  if (!quotaAllowed) return NextResponse.json({ error: "Free usage limit reached for this 15-minute window. Try again later." }, { status: 429 });

  let response: Response;
  try {
    response = await fetch(endpoint.replace(/\/$/, "") + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
      body: JSON.stringify({
        model,
        temperature: body.task === "solve" ? 0.15 : 0.25,
        messages: [
          { role: "system", content: "You are a careful examination tutor. Accuracy and source traceability matter more than confidence. Never claim independent verification unless you actually performed it." },
          { role: "user", content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(45000),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "AI provider request failed or timed out. Retry later; no answer was saved." }, { status: 502 });
  }

  if (!response.ok) {
    return NextResponse.json({ error: "AI provider returned an error (" + response.status + "). Check provider quota, model access and server configuration." }, { status: 502 });
  }
  const raw = extractText(await response.json());
  if (!raw.trim()) return NextResponse.json({ error: "AI provider returned an empty response." }, { status: 502 });

  const parsed = parseModelOutput(raw);
  const arithmeticChecks = checkExplicitArithmetic(parsed.answer);
  const verification = getVerificationLabel(arithmeticChecks);
  const { data: saved, error: saveError } = await supabase.from("ai_assistant_outputs").insert({
    owner_id: user.id,
    question_id: body.task === "solve" || body.task === "classify" ? body.questionId ?? null : null,
    task_type: body.task,
    prompt_text: taskInput.slice(0, 12000),
    output_text: parsed.answer,
    provider_model: model,
    review_status: "needs_review",
    verification_status: verification,
    verification_details: arithmeticChecks,
  }).select("id").single();
  if (saveError || !saved) {
    return NextResponse.json({ error: "The answer was generated but could not be saved to your private review history." }, { status: 500 });
  }
  return NextResponse.json({
    ...parsed,
    solutionId: saved.id,
    task: body.task,
    verification,
    arithmeticChecks,
    reviewNotice: "AI-generated content is not fully verified. The optional arithmetic scan checks only explicit one-step numeric equalities; it does not verify algebra, units, diagrams, reasoning, syllabus alignment or marking-scheme accuracy.",
    sourceCount: sourceQuestions.length,
  });
}
