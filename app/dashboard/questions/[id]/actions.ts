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

const solutionReviewSchema = z.object({
  solutionId: z.string().uuid(),
  decision: z.enum(["approved", "needs_correction"]),
  correctionNotes: z.string().trim().max(5000).optional(),
});

export async function reviewQuestionSolution(formData: FormData) {
  const parsed = solutionReviewSchema.safeParse({
    solutionId: String(formData.get("solutionId") ?? ""),
    decision: String(formData.get("decision") ?? ""),
    correctionNotes: String(formData.get("correctionNotes") ?? ""),
  });
  if (!parsed.success) redirect("/dashboard/questions?review=invalid");

  if (parsed.data.decision === "needs_correction" && !parsed.data.correctionNotes) {
    redirect("/dashboard/questions?review=notes_required");
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const typedSupabase = supabase as unknown as SupabaseClient<DatabaseWithAISolutions>;
  const { data: solution, error: solutionError } = await typedSupabase
    .from("question_solutions")
    .select("id,question_id,owner_id")
    .eq("id", parsed.data.solutionId)
    .maybeSingle();

  if (solutionError || !solution) redirect("/dashboard/questions?review=not_found");

  const { error: insertError } = await typedSupabase
    .from("question_solution_reviews")
    .insert({
      solution_id: solution.id,
      owner_id: solution.owner_id,
      reviewer_id: user.id,
      decision: parsed.data.decision,
      correction_notes: parsed.data.correctionNotes || null,
    });

  if (insertError) redirect("/dashboard/questions/" + solution.question_id + "?review=save_failed");

  revalidatePath("/dashboard/questions/" + solution.question_id);
  redirect(
    "/dashboard/questions/" + solution.question_id +
    "?solution=" + solution.id +
    "&review=" + parsed.data.decision
  );
}

const teacherInviteSchema = z.object({
  questionId: z.string().uuid(),
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
});

export async function createQuestionTeacherInvite(formData: FormData) {
  const parsed = teacherInviteSchema.safeParse({ questionId: String(formData.get("questionId") ?? ""), email: String(formData.get("email") ?? "") });
  if (!parsed.success) redirect("/dashboard/questions?invite=invalid");
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  if (user.email?.toLowerCase() === parsed.data.email) redirect("/dashboard/questions/" + parsed.data.questionId + "?invite=self");
  const { data: question, error: questionError } = await supabase.from("questions").select("id").eq("id", parsed.data.questionId).eq("owner_id", user.id).maybeSingle();
  if (questionError || !question) redirect("/dashboard/questions?invite=not_found");
  const typedSupabase = supabase as unknown as SupabaseClient<DatabaseWithAISolutions>;
  const { error: inviteError } = await typedSupabase.from("question_teacher_invites").insert({ question_id: question.id, owner_id: user.id, invited_email: parsed.data.email });
  if (inviteError) redirect("/dashboard/questions/" + question.id + "?invite=" + (inviteError.code === "23505" ? "exists" : "save_failed"));
  revalidatePath("/dashboard/questions/" + question.id);
  revalidatePath("/dashboard/teacher-invites");
  redirect("/dashboard/questions/" + question.id + "?invite=created");
}

export async function acceptQuestionTeacherInvite(formData: FormData) {
  const inviteId = z.string().uuid().safeParse(String(formData.get("inviteId") ?? ""));
  if (!inviteId.success) redirect("/dashboard/teacher-invites?invite=invalid");
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user?.email) redirect("/login");
  const typedSupabase = supabase as unknown as SupabaseClient<DatabaseWithAISolutions>;
  const { data: invite, error } = await typedSupabase.from("question_teacher_invites")
    .update({ accepted_by: user.id, accepted_at: new Date().toISOString() })
    .eq("id", inviteId.data).is("accepted_by", null).is("revoked_at", null)
    .select("question_id").maybeSingle();
  if (error || !invite) redirect("/dashboard/teacher-invites?invite=not_available");
  revalidatePath("/dashboard/teacher-invites");
  redirect("/dashboard/questions/" + invite.question_id + "?invite=accepted");
}

export async function revokeQuestionTeacherInvite(formData: FormData) {
  const inviteId = z.string().uuid().safeParse(String(formData.get("inviteId") ?? ""));
  const questionId = z.string().uuid().safeParse(String(formData.get("questionId") ?? ""));
  if (!inviteId.success || !questionId.success) redirect("/dashboard/questions?invite=invalid");
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  const typedSupabase = supabase as unknown as SupabaseClient<DatabaseWithAISolutions>;
  const { error } = await typedSupabase.from("question_teacher_invites").delete().eq("id", inviteId.data).eq("question_id", questionId.data).eq("owner_id", user.id);
  if (error) redirect("/dashboard/questions/" + questionId.data + "?invite=revoke_failed");
  revalidatePath("/dashboard/questions/" + questionId.data);
  revalidatePath("/dashboard/teacher-invites");
  redirect("/dashboard/questions/" + questionId.data + "?invite=revoked");
}
