"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { questionClassificationSchema } from "@/lib/questions/classification";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function updateQuestionClassification(formData: FormData) {
  const parsed = questionClassificationSchema.safeParse({
    questionId: String(formData.get("questionId") ?? ""),
    board: String(formData.get("board") ?? ""),
    qualification: String(formData.get("qualification") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    syllabusVersion: String(formData.get("syllabusVersion") ?? ""),
    chapter: String(formData.get("chapter") ?? ""),
    topic: String(formData.get("topic") ?? ""),
    classificationStatus: String(formData.get("classificationStatus") ?? ""),
    classificationConfidence: String(formData.get("classificationConfidence") ?? ""),
  });

  if (!parsed.success) redirect("/dashboard/questions?classification=invalid");

  const values = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data, error } = await supabase.from("questions").update({
    board: values.board || null,
    qualification: values.qualification || null,
    subject: values.subject || null,
    syllabus_version: values.syllabusVersion || null,
    chapter: values.chapter || null,
    topic: values.topic || null,
    classification_status: values.classificationStatus,
    classification_confidence: values.classificationConfidence,
  }).eq("id", values.questionId).eq("owner_id", user.id).select("id").maybeSingle();

  if (error || !data) {
    redirect("/dashboard/questions/" + values.questionId + "?classification=save_failed");
  }

  revalidatePath("/dashboard/questions");
  revalidatePath("/dashboard/questions/" + values.questionId);
  redirect("/dashboard/questions/" + values.questionId + "?classification=saved");
}
