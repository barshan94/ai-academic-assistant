"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const questionIdSchema = z.string().uuid();
const importanceSchema = z.object({
  questionId: z.string().uuid(),
  importanceLevel: z.enum(["core", "high", "medium"]),
  rationale: z.string().trim().max(500),
});

export async function saveQuestionImportance(formData: FormData) {
  const parsed = importanceSchema.safeParse({
    questionId: formData.get("questionId") ?? "",
    importanceLevel: formData.get("importanceLevel") ?? "",
    rationale: formData.get("rationale") ?? "",
  });
  if (!parsed.success) redirect("/dashboard/important-questions?status=invalid");
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data: question, error: questionError } = await supabase.from("questions")
    .select("id").eq("id", parsed.data.questionId).eq("owner_id", user.id)
    .eq("review_status", "approved").maybeSingle();
  if (questionError || !question) redirect("/dashboard/important-questions?status=failed");

  const { error } = await supabase.from("question_importance").upsert({
    owner_id: user.id,
    question_id: question.id,
    importance_level: parsed.data.importanceLevel,
    rationale: parsed.data.rationale,
    marked_by: user.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: "question_id,owner_id" });
  redirect("/dashboard/important-questions?status=" + (error ? "failed" : "saved"));
}

export async function removeQuestionImportance(formData: FormData) {
  const parsed = questionIdSchema.safeParse(formData.get("questionId") ?? "");
  if (!parsed.success) redirect("/dashboard/important-questions?status=invalid");
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  const { error } = await supabase.from("question_importance").delete()
    .eq("question_id", parsed.data).eq("owner_id", user.id);
  redirect("/dashboard/important-questions?status=" + (error ? "failed" : "removed"));
}
