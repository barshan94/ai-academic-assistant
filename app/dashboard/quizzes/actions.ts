"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateQuizWithRouting } from "@/lib/ai/quiz";
import { AIConfigurationError } from "@/lib/ai/provider";
import type { Json } from "@/types/database";
import type { DatabaseWithQuiz } from "@/types/quiz-database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getQuizSourceScopeError } from "@/lib/quiz-source-selection";

const generateSchema = z.object({
  title: z.string().trim().min(1).max(160),
  subject: z.string().trim().min(1).max(120),
  chapter: z.string().trim().max(160).optional(),
  count: z.coerce.number().int().min(1).max(30),
  questionIds: z.array(z.string().uuid()).min(1).max(20),
});

export async function generateQuizDraft(formData: FormData) {
  const parsed = generateSchema.safeParse({
    title: formData.get("title") ?? "",
    subject: formData.get("subject") ?? "",
    chapter: formData.get("chapter") ?? "",
    count: formData.get("count") ?? "10",
    questionIds: formData.getAll("questionIds"),
  });
  if (!parsed.success) redirect("/dashboard/quizzes?generate=invalid");

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const uniqueIds = Array.from(new Set(parsed.data.questionIds));
  if (uniqueIds.length !== parsed.data.questionIds.length) {
    redirect("/dashboard/quizzes?generate=invalid");
  }

  const { data: questions, error: sourceError } = await supabase.from("questions")
    .select("id,question_text,subject,chapter,topic,review_status")
    .eq("owner_id", user.id)
    .eq("review_status", "approved")
    .in("id", uniqueIds);
  if (sourceError || !questions || questions.length !== uniqueIds.length) {
    redirect("/dashboard/quizzes?generate=sources");
  }

  const sourceScopeError = getQuizSourceScopeError(
    questions.map((question) => ({
      id: question.id,
      question_number: null,
      question_text: question.question_text,
      subject: question.subject,
      chapter: question.chapter,
    })),
    parsed.data.subject,
    parsed.data.chapter || null,
  );
  if (sourceScopeError === "subject") redirect("/dashboard/quizzes?generate=mixed_subject");
  if (sourceScopeError === "chapter") redirect("/dashboard/quizzes?generate=mixed_chapter");
  const sourceSubject = parsed.data.subject;

  const questionsById = new Map(questions.map((question) => [question.id, question]));
  // Keep source reference numbering aligned with the exact ordered IDs saved in the draft.
  const orderedQuestions = uniqueIds.map((id) => questionsById.get(id)).filter(
    (question): question is NonNullable<typeof questions[number]> => Boolean(question),
  );
  if (orderedQuestions.length !== uniqueIds.length) redirect("/dashboard/quizzes?generate=sources");

  const sources = orderedQuestions.map((question, index) => ({
    ref: "S" + (index + 1),
    questionText: question.question_text,
    subject: question.subject,
    chapter: question.chapter,
    topic: question.topic,
  }));

  let generated;
  try {
    const result = await generateQuizWithRouting({
      subject: sourceSubject,
      chapter: parsed.data.chapter || null,
      count: parsed.data.count,
      sources,
    });
    generated = result.quiz;
  } catch (error) {
    if (error instanceof AIConfigurationError) {
      redirect("/dashboard/quizzes?generate=not_configured");
    }
    redirect("/dashboard/quizzes?generate=failed");
  }

  const db = supabase as unknown as SupabaseClient<DatabaseWithQuiz>;
  const { data: quizId, error: saveError } = await db.rpc("save_generated_quiz_draft", {
    p_title: parsed.data.title,
    p_subject: sourceSubject,
    p_chapter: parsed.data.chapter || null,
    p_quiz_json: generated as unknown as Json,
    p_source_question_ids: uniqueIds,
  });
  if (saveError || !quizId) redirect("/dashboard/quizzes?generate=save_failed");

  revalidatePath("/dashboard/quizzes");
  redirect("/dashboard/quizzes?generate=saved");
}

const statusSchema = z.object({
  quizId: z.string().uuid(),
  status: z.enum(["approved", "archived"]),
});

export async function updateQuizDraftStatus(formData: FormData) {
  const parsed = statusSchema.safeParse({
    quizId: formData.get("quizId") ?? "",
    status: formData.get("status") ?? "",
  });
  if (!parsed.success) redirect("/dashboard/quizzes?status=invalid");

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const db = supabase as unknown as SupabaseClient<DatabaseWithQuiz>;
  const { data, error } = await db.rpc("update_generated_quiz_status", {
    p_quiz_id: parsed.data.quizId,
    p_status: parsed.data.status,
  });
  if (error || !data) redirect("/dashboard/quizzes?status=blocked");

  revalidatePath("/dashboard/quizzes");
  redirect("/dashboard/quizzes?status=updated");
}


const editQuestionSchema = z.object({
  quizId: z.string().uuid(),
  questionIndex: z.coerce.number().int().min(0).max(29),
  prompt: z.string().trim().min(1).max(2000),
  options: z.string().max(2200),
  correctAnswer: z.string().trim().min(1).max(1000),
  explanation: z.string().trim().min(1).max(2000),
});

export async function updateQuizDraftQuestion(formData: FormData) {
  const parsed = editQuestionSchema.safeParse({
    quizId: formData.get("quizId") ?? "",
    questionIndex: formData.get("questionIndex") ?? "",
    prompt: formData.get("prompt") ?? "",
    options: formData.get("options") ?? "",
    correctAnswer: formData.get("correctAnswer") ?? "",
    explanation: formData.get("explanation") ?? "",
  });
  if (!parsed.success) redirect("/dashboard/quizzes?edit=invalid");

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const options = parsed.data.options === "" ? [] : parsed.data.options.split("\n").map((value) => value.trim());
  if (options.some((value) => !value) || new Set(options).size !== options.length ||
      (options.length !== 0 && options.length !== 4)) {
    redirect("/dashboard/quizzes?edit=invalid");
  }

  const db = supabase as unknown as SupabaseClient<DatabaseWithQuiz>;
  const { data, error } = await db.rpc("update_generated_quiz_question", {
    p_quiz_id: parsed.data.quizId,
    p_question_index: parsed.data.questionIndex,
    p_prompt: parsed.data.prompt,
    p_options: options,
    p_correct_answer: parsed.data.correctAnswer,
    p_explanation: parsed.data.explanation,
  });
  if (error || !data) redirect("/dashboard/quizzes?edit=blocked");

  revalidatePath("/dashboard/quizzes");
  redirect("/dashboard/quizzes?edit=saved");
}
