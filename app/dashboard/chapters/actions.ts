"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import { consumeAIGenerationQuota } from "@/lib/security/ai-generation-quota";
import { logSafeOperationalEvent } from "@/lib/observability/safe-log";
import { AIConfigurationError, getAIProviderConfigs } from "@/lib/ai/provider";
import { parseChapterNoteDraftInput, parseChapterNoteGenerationInput, parseChapterNoteStatusInput } from "@/lib/chapters/note-form";

function lines(value: string, maxItems: number): string[] {
  return value.split("\n").map((item) => item.trim()).filter(Boolean).slice(0, maxItems);
}

export async function createChapterNoteDraft(formData: FormData) {
  const parsed = parseChapterNoteDraftInput({
    catalogId: formData.get("catalogId") ?? "",
    chapterId: formData.get("chapterId") ?? "",
    title: formData.get("title") ?? "",
    summary: formData.get("summary") ?? "",
    concepts: formData.get("concepts") ?? "",
    formulas: formData.get("formulas") ?? "",
    workedExamples: formData.get("workedExamples") ?? "",
    revisionPrompts: formData.get("revisionPrompts") ?? "",
    questionIds: formData.getAll("questionIds"),
    documentPageIds: formData.getAll("documentPageIds"),
    supersedesId: formData.get("supersedesId") ?? "",
  });
  if (!parsed.success) redirect("/dashboard/chapters?create=invalid");

  const value = parsed.data;
  if (value.questionIds.length + value.documentPageIds.length < 1) {
    redirect("/dashboard/chapters?create=source_required");
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const content: Json = {
    summary: value.summary,
    concepts: lines(value.concepts, 30),
    formulas: lines(value.formulas, 20),
    workedExamples: lines(value.workedExamples, 20),
    revisionPrompts: lines(value.revisionPrompts, 20),
    generatedBy: "owner-authored",
    reviewRequired: true,
  };

  const { data: noteId, error } = await supabase.rpc("create_chapter_note_draft", {
    p_catalog_id: value.catalogId,
    p_chapter_id: value.chapterId,
    p_title: value.title,
    p_content_json: content,
    p_question_ids: value.questionIds,
    p_document_page_ids: value.documentPageIds,
    p_supersedes_id: value.supersedesId || null,
  });

  if (error || !noteId) {
    redirect("/dashboard/chapters?create=save_failed");
  }

  revalidatePath("/dashboard/chapters");
  redirect("/dashboard/chapters?create=saved");
}


export async function generateChapterNoteDraft(formData: FormData) {
  const parsed = parseChapterNoteGenerationInput({
    catalogId: formData.get("catalogId") ?? "",
    chapterId: formData.get("chapterId") ?? "",
    supersedesId: formData.get("supersedesId") ?? "",
  });
  if (!parsed.success) redirect("/dashboard/chapters?ai=invalid");

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const [{ data: catalog }, { data: chapter }, { data: questions, error: questionError }] = await Promise.all([
    supabase.from("syllabus_catalogs").select("id,board,qualification,subject").eq("id", parsed.data.catalogId).eq("owner_id", user.id).maybeSingle(),
    supabase.from("syllabus_chapters").select("id,catalog_id,title").eq("id", parsed.data.chapterId).eq("catalog_id", parsed.data.catalogId).eq("owner_id", user.id).maybeSingle(),
    supabase.from("questions").select("id,question_number,question_text,document_page_id")
      .eq("owner_id", user.id).eq("syllabus_chapter_id", parsed.data.chapterId)
      .eq("review_status", "approved").order("created_at", { ascending: false }).limit(12),
  ]);
  if (!catalog || !chapter || questionError || !questions?.length) {
    redirect("/dashboard/chapters?ai=no_sources");
  }

  const pageIds = Array.from(new Set(questions.map((question) => question.document_page_id).filter((id): id is string => Boolean(id))));
  const { data: pages, error: pageError } = pageIds.length
    ? await supabase.from("document_pages").select("id,page_number,extracted_text,extraction_method").eq("owner_id", user.id).in("id", pageIds)
    : { data: [], error: null };
  if (pageError) redirect("/dashboard/chapters?ai=source_error");
  const pageMap = new Map((pages ?? []).map((page) => [page.id, page]));

  // Avoid charging quota when no chapter-note provider is configured.
  try {
    getAIProviderConfigs("chapter-note");
  } catch (error) {
    if (error instanceof AIConfigurationError) redirect("/dashboard/chapters?ai=not_configured");
    throw error;
  }

  const quota = await consumeAIGenerationQuota(supabase, "ai-chapter-note");
  if (quota !== "allowed") {
    logSafeOperationalEvent(quota === "limited" ? "ai_generation_quota_exhausted" : "ai_generation_quota_unavailable", {
      route: "/dashboard/chapters",
      errorCode: quota === "limited" ? "CHAPTER_NOTE_QUOTA_REACHED" : "CHAPTER_NOTE_QUOTA_RPC_FAILED",
    });
    redirect("/dashboard/chapters?ai=" + (quota === "limited" ? "rate_limited" : "rate_limit_unavailable"));
  }

  const sources = questions.map((question, index) => {
    const page = question.document_page_id ? pageMap.get(question.document_page_id) : undefined;
    return {
      ref: "S" + (index + 1),
      questionId: question.id,
      questionNumber: question.question_number,
      questionText: question.question_text,
      pageId: page?.id ?? null,
      pageNumber: page?.page_number ?? null,
      extractionMethod: page?.extraction_method ?? null,
      pageText: page?.extracted_text ?? null,
    };
  });

  let generated;
  let generationMetadata: { provider: string; model: string } | null = null;
  try {
    const { generateChapterNoteWithRouting } = await import("@/lib/ai/chapter-notes");
    const routed = await generateChapterNoteWithRouting({
      board: catalog.board,
      qualification: catalog.qualification,
      subject: catalog.subject,
      chapter: chapter.title,
      sources,
    });
    generated = routed.note;
    generationMetadata = { provider: routed.config.provider, model: routed.config.model };
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI_GENERATION_FAILED";
    logSafeOperationalEvent("ai_generation_failed", { route: "/dashboard/chapters", errorCode: "CHAPTER_NOTE_GENERATION_FAILED" });
    redirect("/dashboard/chapters?ai=" + (message === "AI_NOT_CONFIGURED" ? "not_configured" : "failed"));
  }

  const content: Json = {
    summary: generated.summary,
    concepts: generated.concepts,
    formulas: generated.formulas,
    workedExamples: generated.workedExamples,
    revisionPrompts: generated.revisionPrompts,
    generatedBy: "ai",
    reviewRequired: true,
    sourceReferences: sources.map((source) => ({
      ref: source.ref,
      questionId: source.questionId,
      pageId: source.pageId,
      pageNumber: source.pageNumber,
      extractionMethod: source.extractionMethod,
    })),
    generationProvider: generationMetadata?.provider ?? "unknown",
    generationModel: generationMetadata?.model ?? "unknown",
    verificationStatus: "not_independently_verified",
  };

  const { data: noteId, error: saveError } = await supabase.rpc("create_chapter_note_draft", {
    p_catalog_id: parsed.data.catalogId,
    p_chapter_id: parsed.data.chapterId,
    p_title: generated.title,
    p_content_json: content,
    p_question_ids: questions.map((question) => question.id),
    p_document_page_ids: pageIds,
    p_supersedes_id: parsed.data.supersedesId || null,
  });
  if (saveError || !noteId) redirect("/dashboard/chapters?ai=save_failed");

  revalidatePath("/dashboard/chapters");
  redirect("/dashboard/chapters?ai=generated");
}

export async function updateChapterNoteStatus(formData: FormData) {
  const parsed = parseChapterNoteStatusInput({
    noteId: formData.get("noteId") ?? "",
    status: formData.get("status") ?? "",
  });
  if (!parsed.success) redirect("/dashboard/chapters?status=invalid");

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data, error } = await supabase.from("chapter_note_versions")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.noteId)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    redirect("/dashboard/chapters?status=blocked");
  }

  revalidatePath("/dashboard/chapters");
  redirect("/dashboard/chapters?status=updated");
}
