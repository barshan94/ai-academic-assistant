"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { redirect } from "next/navigation";
import { questionClassificationSchema } from "@/lib/questions/classification";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function updateQuestionClassification(formData: FormData) {
  const parsed = questionClassificationSchema.safeParse({
    questionId: String(formData.get("questionId") ?? ""),
    catalogId: String(formData.get("catalogId") ?? ""),
    chapterId: String(formData.get("chapterId") ?? ""),
    topicId: String(formData.get("topicId") ?? ""),
    board: String(formData.get("board") ?? ""),
    qualification: String(formData.get("qualification") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    syllabusVersion: String(formData.get("syllabusVersion") ?? ""),
    chapter: String(formData.get("chapter") ?? ""),
    topic: String(formData.get("topic") ?? ""),
    classificationStatus: String(formData.get("classificationStatus") ?? ""),
    classificationConfidence: String(formData.get("classificationConfidence") ?? ""),
  });

  if (!parsed.success) {
    const questionId = z.string().uuid().safeParse(String(formData.get("questionId") ?? ""));
    if (questionId.success) {
      const status = String(formData.get("classificationStatus") ?? "");
      redirect("/dashboard/questions/" + questionId.data + "?classification=" + (status === "confirmed" ? "incomplete" : "invalid"));
    }
    redirect("/dashboard/questions?classification=invalid");
  }

  const values = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  let board = values.board || null;
  let qualification = values.qualification || null;
  let subject = values.subject || null;
  let syllabusVersion = values.syllabusVersion || null;
  let chapter = values.chapter || null;
  let topic = values.topic || null;
  let catalogId: string | null = null;
  let chapterId: string | null = null;
  let topicId: string | null = null;

  if (values.catalogId) {
    const { data: catalog } = await supabase.from("syllabus_catalogs")
      .select("id,board,qualification,subject,version,status")
      .eq("id", values.catalogId).eq("owner_id", user.id).maybeSingle();
    if (!catalog) redirect("/dashboard/questions/" + values.questionId + "?classification=reference_not_found");
    if (values.classificationStatus === "confirmed" && catalog.status !== "verified") {
      redirect("/dashboard/questions/" + values.questionId + "?classification=catalog_unverified");
    }
    catalogId = catalog.id;
    board = catalog.board;
    qualification = catalog.qualification;
    subject = catalog.subject;
    syllabusVersion = catalog.version;

    if (values.chapterId) {
      const { data: selectedChapter } = await supabase.from("syllabus_chapters")
        .select("id,title").eq("id", values.chapterId).eq("catalog_id", catalog.id)
        .eq("owner_id", user.id).maybeSingle();
      if (!selectedChapter) redirect("/dashboard/questions/" + values.questionId + "?classification=reference_mismatch");
      chapterId = selectedChapter.id;
      chapter = selectedChapter.title;

      if (values.topicId) {
        const { data: selectedTopic } = await supabase.from("syllabus_topics")
          .select("id,title").eq("id", values.topicId).eq("chapter_id", selectedChapter.id)
          .eq("owner_id", user.id).maybeSingle();
        if (!selectedTopic) redirect("/dashboard/questions/" + values.questionId + "?classification=reference_mismatch");
        topicId = selectedTopic.id;
        topic = selectedTopic.title;
      } else {
        topic = null;
      }
    } else {
      if (values.topicId) redirect("/dashboard/questions/" + values.questionId + "?classification=reference_mismatch");
      chapter = null;
      topic = null;
    }
  } else {
    if (values.chapterId || values.topicId) redirect("/dashboard/questions/" + values.questionId + "?classification=reference_mismatch");
  }

  const { data, error } = await supabase.from("questions").update({
    board,
    qualification,
    subject,
    syllabus_version: syllabusVersion,
    chapter,
    topic,
    syllabus_catalog_id: catalogId,
    syllabus_chapter_id: chapterId,
    syllabus_topic_id: topicId,
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
