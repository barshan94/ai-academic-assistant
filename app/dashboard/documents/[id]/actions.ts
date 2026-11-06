"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { questionCreateSchema } from "@/lib/questions/validation";
import { parsePageCorrectionInput } from "@/lib/documents/page-correction-input";

export async function savePageCorrection(formData: FormData) {
  const rawDocumentId = formData.get("documentId");
  const documentId = typeof rawDocumentId === "string" ? rawDocumentId : "";
  const parsed = parsePageCorrectionInput({
    pageId: formData.get("pageId"),
    documentId: rawDocumentId,
    extractedText: formData.get("extractedText"),
  });
  if (!parsed.success) {
    redirect("/dashboard/documents/" + encodeURIComponent(documentId) + "?review=invalid");
  }
  const { pageId, extractedText } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data: correctionSaved, error: correctionError } = await supabase.rpc("save_document_page_correction", {
    p_document_id: documentId,
    p_owner_id: user.id,
    p_page_id: pageId,
    p_extracted_text: extractedText,
  });

  redirect("/dashboard/documents/" + encodeURIComponent(documentId) +
    (correctionError || correctionSaved !== true ? "?review=save_failed" : "?review=saved"));
}

export async function approveDocument(formData: FormData) {
  const documentId = z.string().uuid().safeParse(formData.get("documentId") ?? "");
  if (!documentId.success) {
    redirect("/dashboard/documents?review=invalid");
  }
  if (formData.get("confirmReviewed") !== "yes") {
    redirect("/dashboard/documents/" + encodeURIComponent(documentId.data) + "?review=confirm_required");
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { error: approvalError } = await supabase.rpc("approve_document_review", {
    p_document_id: documentId.data,
    p_owner_id: user.id,
  });

  redirect("/dashboard/documents/" + encodeURIComponent(documentId.data) +
    (approvalError ? "?review=approve_failed" : "?review=approved"));
}

export async function createQuestionFromPage(formData: FormData) {
  const rawDocumentId = formData.get("documentId");
  const documentId = typeof rawDocumentId === "string" ? rawDocumentId : "";
  // Keep non-string FormData entries intact so Zod rejects File/Blob values
  // instead of coercing them to the accepted literal string "[object File]".
  const parsed = questionCreateSchema.safeParse({
    documentId: rawDocumentId ?? "",
    documentPageId: formData.get("documentPageId") ?? "",
    questionText: formData.get("questionText") ?? "",
    questionNumber: formData.get("questionNumber") ?? "",
    board: formData.get("board") ?? "",
    qualification: formData.get("qualification") ?? "",
    subject: formData.get("subject") ?? "",
    chapter: formData.get("chapter") ?? "",
    topic: formData.get("topic") ?? "",
  });

  if (!parsed.success) {
    redirect("/dashboard/documents/" + encodeURIComponent(documentId) + "?question=invalid");
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { error } = await supabase.rpc("create_question_from_reviewed_page", {
    p_document_id: parsed.data.documentId,
    p_document_page_id: parsed.data.documentPageId,
    p_owner_id: user.id,
    p_question_text: parsed.data.questionText,
    p_question_number: parsed.data.questionNumber,
    p_board: parsed.data.board,
    p_qualification: parsed.data.qualification,
    p_subject: parsed.data.subject,
    p_chapter: parsed.data.chapter,
    p_topic: parsed.data.topic,
  });

  redirect(error
    ? "/dashboard/documents/" + encodeURIComponent(documentId) + "?question=save_failed"
    : "/dashboard/questions?created=1");
}
