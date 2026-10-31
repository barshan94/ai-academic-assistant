"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createHash } from "node:crypto";
import { prepareSourcePageContext } from "@/lib/ai/source-context";
import { markSchemeSchema } from "@/lib/ai/mark-scheme";
import { generateStructuredAnswer, getAIProviderConfig, AIConfigurationError, AIProviderError } from "@/lib/ai/provider";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DatabaseWithAISolutions } from "@/types/ai-database";
import type { Json } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { consumeAIGenerationQuota } from "@/lib/security/ai-generation-quota";

const questionIdSchema = z.string().uuid();

export async function generateQuestionSolution(formData: FormData) {
  const questionId = questionIdSchema.safeParse(String(formData.get("questionId") ?? ""));
  if (!questionId.success) redirect("/dashboard/questions?solve=invalid");

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data: question, error: questionError } = await supabase
    .from("questions")
    .select("id,document_id,document_page_id,question_text,review_status,board,qualification,subject,chapter,topic")
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

  const includeSource = formData.get("includeSourceContext") === "yes";
  let sourceContext;
  let sourceProvenance = null;
  if (includeSource) {
    if (!question.document_page_id) redirect("/dashboard/questions/" + question.id + "?solve=source_unavailable");
    const { data: page, error: pageError } = await supabase.from("document_pages")
      .select("id,page_number,extracted_text,extraction_method")
      .eq("id", question.document_page_id).eq("document_id", question.document_id).eq("owner_id", user.id).maybeSingle();
    if (pageError || !page) redirect("/dashboard/questions/" + question.id + "?solve=source_unavailable");
    const { data: document } = await supabase.from("documents").select("id,file_name").eq("id", question.document_id).eq("owner_id", user.id).maybeSingle();
    if (!document) redirect("/dashboard/questions/" + question.id + "?solve=source_unavailable");
    try {
      sourceContext = prepareSourcePageContext({ pageNumber: page.page_number, extractionMethod: page.extraction_method, extractedText: page.extracted_text });
    } catch {
      redirect("/dashboard/questions/" + question.id + "?solve=source_empty");
    }
    sourceProvenance = {
      document_id: document.id,
      page_id: page.id,
      document_name: document.file_name,
      page_number: sourceContext.pageNumber,
      extraction_method: sourceContext.extractionMethod,
      excerpt_sha256: createHash("sha256").update(sourceContext.text, "utf8").digest("hex"),
      excerpt_length: sourceContext.text.length,
    };
  }

  const quota = await consumeAIGenerationQuota(supabase, "ai-solution");
  if (quota !== "allowed") {
    redirect("/dashboard/questions/" + question.id + "?solve=" + (quota === "limited" ? "rate_limited" : "rate_limit_unavailable"));
  }

  let answer;
  try {
    answer = await generateStructuredAnswer(question.question_text, config, fetch, {
      board: question.board,
      qualification: question.qualification,
      subject: question.subject,
      chapter: question.chapter,
      topic: question.topic,
      ...(sourceContext ? { sourceContext } : {}),
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
    prompt_version: sourceContext ? "academic-answer-v3-source-context" : "academic-answer-v2-math-checks",
    answer_json: answer,
    source_context: sourceProvenance,
  });

  if (saveError) redirect("/dashboard/questions/" + question.id + "?solve=save_failed");

  revalidatePath("/dashboard/questions");
  revalidatePath("/dashboard/questions/" + question.id);
  redirect("/dashboard/questions/" + question.id + "?solve=generated");
}

export async function saveQuestionSolutionMarkScheme(formData: FormData) {
  const solutionId = z.string().uuid().safeParse(String(formData.get("solutionId") ?? ""));
  let rawPoints: unknown;
  try {
    rawPoints = JSON.parse(String(formData.get("points") ?? ""));
  } catch {
    redirect("/dashboard/questions?mark_scheme=invalid_json");
  }
  const parsedScheme = markSchemeSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    awardingBody: String(formData.get("awardingBody") ?? ""),
    qualification: String(formData.get("qualification") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    paperReference: String(formData.get("paperReference") ?? "") || undefined,
    sourceUrl: String(formData.get("sourceUrl") ?? ""),
    points: rawPoints,
  });
  if (!solutionId.success || !parsedScheme.success) {
    redirect("/dashboard/questions?mark_scheme=invalid");
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const typedSupabase = supabase as unknown as SupabaseClient<DatabaseWithAISolutions>;
  const { data: solution, error: solutionError } = await typedSupabase
    .from("question_solutions")
    .select("id,question_id")
    .eq("id", solutionId.data)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (solutionError || !solution) redirect("/dashboard/questions?mark_scheme=not_found");

  const scheme = parsedScheme.data;
  const { error: insertError } = await typedSupabase.from("question_solution_mark_schemes").insert({
    solution_id: solution.id,
    owner_id: user.id,
    title: scheme.title,
    awarding_body: scheme.awardingBody,
    qualification: scheme.qualification,
    subject: scheme.subject,
    paper_reference: scheme.paperReference ?? null,
    source_url: scheme.sourceUrl,
    points: scheme.points as unknown as Json,
  });
  if (insertError) redirect("/dashboard/questions/" + solution.question_id + "?mark_scheme=save_failed");

  revalidatePath("/dashboard/questions/" + solution.question_id);
  redirect("/dashboard/questions/" + solution.question_id + "?solution=" + solution.id + "&mark_scheme=saved");
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

  if (solution.owner_id !== user.id) {
    // Teacher reviews go through a SECURITY DEFINER RPC that revalidates the
    // active invitation and alone may promote/demote the verification label.
    const { error: teacherReviewError } = await typedSupabase.rpc("record_teacher_solution_review", {
      p_solution_id: solution.id,
      p_decision: parsed.data.decision,
      p_correction_notes: parsed.data.correctionNotes || null,
    });
    if (teacherReviewError) {
      const result = teacherReviewError.code === "42501" ? "not_authorized" : "save_failed";
      redirect("/dashboard/questions/" + solution.question_id + "?review=" + result);
    }
  } else {
    const { error: ownerReviewError } = await typedSupabase
      .from("question_solution_reviews")
      .insert({
        solution_id: solution.id,
        owner_id: solution.owner_id,
        reviewer_id: user.id,
        decision: parsed.data.decision,
        correction_notes: parsed.data.correctionNotes || null,
      });
    if (ownerReviewError) redirect("/dashboard/questions/" + solution.question_id + "?review=save_failed");
  }

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
  const { error } = await typedSupabase.from("question_teacher_invites").update({ revoked_at: new Date().toISOString() }).eq("id", inviteId.data).eq("question_id", questionId.data).eq("owner_id", user.id).is("revoked_at", null);
  if (error) redirect("/dashboard/questions/" + questionId.data + "?invite=revoke_failed");
  revalidatePath("/dashboard/questions/" + questionId.data);
  revalidatePath("/dashboard/teacher-invites");
  redirect("/dashboard/questions/" + questionId.data + "?invite=revoked");
}
