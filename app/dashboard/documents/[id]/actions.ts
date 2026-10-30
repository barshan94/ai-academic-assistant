"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { questionCreateSchema } from "@/lib/questions/validation";

export async function savePageCorrection(formData: FormData) {
  const pageId = String(formData.get("pageId") ?? "");
  const documentId = String(formData.get("documentId") ?? "");
  const extractedText = String(formData.get("extractedText") ?? "").trim();
  if (!pageId || !documentId || !extractedText || extractedText.length > 50000) {
    redirect("/dashboard/documents/" + encodeURIComponent(documentId) + "?review=invalid");
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { error } = await supabase.from("document_pages").update({
    extracted_text: extractedText,
    extraction_method: "manual",
    status: "review_required",
  }).eq("id", pageId).eq("document_id", documentId).eq("owner_id", user.id);

  if (!error) {
    await supabase.from("documents").update({ status: "review_required" }).eq("id", documentId).eq("owner_id", user.id);
  }
  redirect("/dashboard/documents/" + encodeURIComponent(documentId) + (error ? "?review=save_failed" : "?review=saved"));
}

export async function approveDocument(formData: FormData) {
  const documentId = String(formData.get("documentId") ?? "");
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data: pages, error: pageError } = await supabase
    .from("document_pages")
    .select("id")
    .eq("document_id", documentId)
    .eq("owner_id", user.id);

  if (pageError || !pages?.length) redirect("/dashboard/documents/" + encodeURIComponent(documentId) + "?review=empty");

  const { error: updatePagesError } = await supabase
    .from("document_pages")
    .update({ status: "complete" })
    .eq("document_id", documentId)
    .eq("owner_id", user.id);
  const { error: updateDocumentError } = await supabase
    .from("documents")
    .update({ status: "ready" })
    .eq("id", documentId)
    .eq("owner_id", user.id);

  redirect("/dashboard/documents/" + encodeURIComponent(documentId) +
    (updatePagesError || updateDocumentError ? "?review=approve_failed" : "?review=approved"));
}

export async function createQuestionFromPage(formData: FormData) {
  const documentId = String(formData.get("documentId") ?? "");
  const parsed = questionCreateSchema.safeParse({
    documentId,
    documentPageId: String(formData.get("documentPageId") ?? ""),
    questionText: String(formData.get("questionText") ?? ""),
    questionNumber: String(formData.get("questionNumber") ?? ""),
    board: String(formData.get("board") ?? ""),
    qualification: String(formData.get("qualification") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    chapter: String(formData.get("chapter") ?? ""),
    topic: String(formData.get("topic") ?? ""),
  });

  if (!parsed.success) {
    redirect("/dashboard/documents/" + encodeURIComponent(documentId) + "?question=invalid");
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data: page, error: pageError } = await supabase
    .from("document_pages")
    .select("id,document_id")
    .eq("id", parsed.data.documentPageId)
    .eq("document_id", parsed.data.documentId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (pageError || !page) {
    redirect("/dashboard/documents/" + encodeURIComponent(documentId) + "?question=source_invalid");
  }

  const { error } = await supabase.from("questions").insert({
    owner_id: user.id,
    document_id: page.document_id,
    document_page_id: page.id,
    question_number: parsed.data.questionNumber,
    question_text: parsed.data.questionText,
    board: parsed.data.board,
    qualification: parsed.data.qualification,
    subject: parsed.data.subject,
    chapter: parsed.data.chapter,
    topic: parsed.data.topic,
    review_status: "needs_review",
  });

  redirect(error
    ? "/dashboard/documents/" + encodeURIComponent(documentId) + "?question=save_failed"
    : "/dashboard/questions?created=1");
}
