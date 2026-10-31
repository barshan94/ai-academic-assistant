"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

const noteSchema = z.object({
  catalogId: z.string().uuid(),
  chapterId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().max(4000),
  concepts: z.string().max(8000),
  formulas: z.string().max(5000),
  workedExamples: z.string().max(10000),
  revisionPrompts: z.string().max(5000),
  questionIds: z.array(z.string().uuid()).max(20),
  documentPageIds: z.array(z.string().uuid()).max(20),
  supersedesId: z.union([z.string().uuid(), z.literal("")]),
});

function lines(value: string, maxItems: number): string[] {
  return value.split("\n").map((item) => item.trim()).filter(Boolean).slice(0, maxItems);
}

export async function createChapterNoteDraft(formData: FormData) {
  const parsed = noteSchema.safeParse({
    catalogId: String(formData.get("catalogId") ?? ""),
    chapterId: String(formData.get("chapterId") ?? ""),
    title: String(formData.get("title") ?? ""),
    summary: String(formData.get("summary") ?? ""),
    concepts: String(formData.get("concepts") ?? ""),
    formulas: String(formData.get("formulas") ?? ""),
    workedExamples: String(formData.get("workedExamples") ?? ""),
    revisionPrompts: String(formData.get("revisionPrompts") ?? ""),
    questionIds: formData.getAll("questionIds").map(String),
    documentPageIds: formData.getAll("documentPageIds").map(String),
    supersedesId: String(formData.get("supersedesId") ?? ""),
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

export async function updateChapterNoteStatus(formData: FormData) {
  const noteId = z.string().uuid().safeParse(String(formData.get("noteId") ?? ""));
  const status = z.enum(["approved", "archived"]).safeParse(String(formData.get("status") ?? ""));
  if (!noteId.success || !status.success) redirect("/dashboard/chapters?status=invalid");

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data, error } = await supabase.from("chapter_note_versions")
    .update({ status: status.data })
    .eq("id", noteId.data)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    redirect("/dashboard/chapters?status=blocked");
  }

  revalidatePath("/dashboard/chapters");
  redirect("/dashboard/chapters?status=updated");
}
