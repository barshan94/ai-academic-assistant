"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { generateStructuredAnswer, getAIProviderConfig, AIConfigurationError, AIProviderError } from "@/lib/ai/provider";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DatabaseWithAISolutions } from "@/types/ai-database";
import type { SupabaseClient } from "@supabase/supabase-js";

const questionIdSchema = z.string().uuid();

export async function generateQuestionSolution(formData: FormData) {
  const questionId = questionIdSchema.safeParse(String(formData.get("questionId") ?? ""));
  if (!questionId.success) redirect("/dashboard/questions?solve=invalid");

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data: question, error: questionError } = await supabase
    .from("questions")
    .select("id,question_text,review_status,board,qualification,subject,chapter,topic")
    .eq("id", questionId.data)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (questionError || !question) redirect("/dashboard/questions?solve=not_found");
  if (question.review_status !== "approved") {
    redirect("/dashboard/questions/" + question.id + "?solve=needs_review");
  }

  let config;
  try {
    config = getAIProviderConfig();
  } catch (error) {
    if (error instanceof AIConfigurationError) {
      redirect("/dashboard/questions/" + question.id + "?solve=not_configured");
    }
    throw error;
  }

  let answer;
  try {
    answer = await generateStructuredAnswer(question.question_text, config, fetch, {
      board: question.board,
      qualification: question.qualification,
      subject: question.subject,
      chapter: question.chapter,
      topic: question.topic,
    });
  } catch (error) {
    const code = error instanceof AIProviderError ? error.message.split(":")[0] : "AI_PROVIDER_ERROR";
    redirect("/dashboard/questions/" + question.id + "?solve=" + encodeURIComponent(code.slice(0, 80)));
  }

  const typedSupabase = supabase as unknown as SupabaseClient<DatabaseWithAISolutions>;
  const { error: saveError } = await typedSupabase.from("question_solutions").insert({
    owner_id: user.id,
    question_id: question.id,
    provider: config.provider,
    model: config.model,
    prompt_version: "academic-answer-v2-math-checks",
    answer_json: answer,
    verification_status: "generated",
  });

  if (saveError) redirect("/dashboard/questions/" + question.id + "?solve=save_failed");

  revalidatePath("/dashboard/questions");
  revalidatePath("/dashboard/questions/" + question.id);
  redirect("/dashboard/questions/" + question.id + "?solve=generated");
}
