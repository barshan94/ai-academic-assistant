"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
