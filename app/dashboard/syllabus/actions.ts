"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseSyllabusImportText } from "@/lib/questions/syllabus-import";
import type { Json } from "@/types/database";
import { parseSyllabusEvidenceInput } from "@/lib/questions/syllabus-evidence";

const dateOnly = z.string().trim().max(10).refine((value) => {
  if (!value) return true;
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;
}, "Enter a real calendar date in YYYY-MM-DD format.");

const catalogSchema = z.object({
  board: z.string().trim().min(1).max(100),
  qualification: z.string().trim().min(1).max(100),
  subject: z.string().trim().min(1).max(120),
  version: z.string().trim().min(1).max(80),
  effectiveFrom: dateOnly,
  effectiveTo: dateOnly,
  sourceUrl: z.string().trim().max(2048).refine((value) => {
    if (!value) return true;
    try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; }
    catch { return false; }
  }),
  sourceTitle: z.string().trim().max(200),
}).superRefine((value, context) => {
  if (value.effectiveFrom && value.effectiveTo && value.effectiveTo < value.effectiveFrom) {
    context.addIssue({
      code: "custom",
      path: ["effectiveTo"],
      message: "The end date must not be earlier than the start date.",
    });
  }
});

const chapterSchema = z.object({
  catalogId: z.string().uuid(),
  title: z.string().trim().min(1).max(160),
  code: z.string().trim().max(40),
  sortOrder: z.coerce.number().int().min(0).max(10000),
});

const topicSchema = z.object({
  chapterId: z.string().uuid(),
  title: z.string().trim().min(1).max(160),
  code: z.string().trim().max(40),
  sortOrder: z.coerce.number().int().min(0).max(10000),
});

async function requireOwner() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return { supabase, user };
}

export async function importSyllabusCatalog(formData: FormData) {
  const parsed = parseSyllabusImportText(String(formData.get("payload") ?? ""));
  if (!parsed.success) redirect("/dashboard/syllabus?import=import_invalid");

  const { supabase } = await requireOwner();
  const { error } = await supabase.rpc("import_syllabus_catalog", {
    payload: parsed.data as Json,
  });

  if (error) {
    redirect("/dashboard/syllabus?import=" + (error.code === "23505" ? "import_duplicate" : "save_failed"));
  }

  revalidatePath("/dashboard/syllabus");
  revalidatePath("/dashboard/questions");
  redirect("/dashboard/syllabus?import=imported");
}

export async function createSyllabusCatalog(formData: FormData) {
  const parsed = catalogSchema.safeParse({
    board: String(formData.get("board") ?? ""),
    qualification: String(formData.get("qualification") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    version: String(formData.get("version") ?? ""),
    effectiveFrom: String(formData.get("effectiveFrom") ?? ""),
    effectiveTo: String(formData.get("effectiveTo") ?? ""),
    sourceUrl: String(formData.get("sourceUrl") ?? ""),
    sourceTitle: String(formData.get("sourceTitle") ?? ""),
  });
  if (!parsed.success) redirect("/dashboard/syllabus?catalog=invalid");

  const { supabase, user } = await requireOwner();
  const value = parsed.data;
  const { error } = await supabase.from("syllabus_catalogs").insert({
    owner_id: user.id,
    board: value.board,
    qualification: value.qualification,
    subject: value.subject,
    version: value.version,
    effective_from: value.effectiveFrom || null,
    effective_to: value.effectiveTo || null,
    source_url: value.sourceUrl || null,
    source_title: value.sourceTitle || null,
  });

  if (error) redirect("/dashboard/syllabus?catalog=" + (error.code === "23505" ? "duplicate" : "save_failed"));
  revalidatePath("/dashboard/syllabus");
  redirect("/dashboard/syllabus?catalog=created");
}

export async function createSyllabusChapter(formData: FormData) {
  const parsed = chapterSchema.safeParse({
    catalogId: String(formData.get("catalogId") ?? ""),
    title: String(formData.get("title") ?? ""),
    code: String(formData.get("code") ?? ""),
    sortOrder: String(formData.get("sortOrder") ?? "0"),
  });
  if (!parsed.success) redirect("/dashboard/syllabus?chapter=invalid");

  const { supabase, user } = await requireOwner();
  const value = parsed.data;
  const { data: catalog } = await supabase.from("syllabus_catalogs")
    .select("id,status").eq("id", value.catalogId).eq("owner_id", user.id).maybeSingle();
  if (!catalog) redirect("/dashboard/syllabus?chapter=not_found");
  if (catalog.status === "retired") redirect("/dashboard/syllabus?chapter=retired");

  const { error } = await supabase.from("syllabus_chapters").insert({
    owner_id: user.id,
    catalog_id: value.catalogId,
    title: value.title,
    chapter_code: value.code || null,
    sort_order: value.sortOrder,
  });
  if (error) redirect("/dashboard/syllabus?chapter=" + (error.code === "23505" ? "duplicate" : "save_failed"));
  revalidatePath("/dashboard/syllabus");
  redirect("/dashboard/syllabus?chapter=created");
}

export async function createSyllabusTopic(formData: FormData) {
  const parsed = topicSchema.safeParse({
    chapterId: String(formData.get("chapterId") ?? ""),
    title: String(formData.get("title") ?? ""),
    code: String(formData.get("code") ?? ""),
    sortOrder: String(formData.get("sortOrder") ?? "0"),
  });
  if (!parsed.success) redirect("/dashboard/syllabus?topic=invalid");

  const { supabase, user } = await requireOwner();
  const value = parsed.data;
  const { data: chapter } = await supabase.from("syllabus_chapters")
    .select("id,catalog_id").eq("id", value.chapterId).eq("owner_id", user.id).maybeSingle();
  if (!chapter) redirect("/dashboard/syllabus?topic=not_found");
  const { data: catalog } = await supabase.from("syllabus_catalogs")
    .select("status").eq("id", chapter.catalog_id).eq("owner_id", user.id).maybeSingle();
  if (!catalog) redirect("/dashboard/syllabus?topic=not_found");
  if (catalog.status === "retired") redirect("/dashboard/syllabus?topic=retired");

  const { error } = await supabase.from("syllabus_topics").insert({
    owner_id: user.id,
    chapter_id: value.chapterId,
    title: value.title,
    topic_code: value.code || null,
    sort_order: value.sortOrder,
  });
  if (error) redirect("/dashboard/syllabus?topic=" + (error.code === "23505" ? "duplicate" : "save_failed"));
  revalidatePath("/dashboard/syllabus");
  redirect("/dashboard/syllabus?topic=created");
}

export async function verifySyllabusCatalog(formData: FormData) {
  const catalogId = z.string().uuid().safeParse(String(formData.get("catalogId") ?? ""));
  if (!catalogId.success) redirect("/dashboard/syllabus?catalog=invalid");
  const { supabase, user } = await requireOwner();
  const { data, error } = await supabase.from("syllabus_catalogs").update({
    status: "verified",
    source_checked_at: new Date().toISOString(),
  }).eq("id", catalogId.data).eq("owner_id", user.id).eq("status", "draft")
    .not("source_url", "is", null).select("id").maybeSingle();
  if (error || !data) redirect("/dashboard/syllabus?catalog=source_required");
  revalidatePath("/dashboard/syllabus");
  revalidatePath("/dashboard/questions");
  redirect("/dashboard/syllabus?catalog=verified");
}

export async function retireSyllabusCatalog(formData: FormData) {
  const catalogId = z.string().uuid().safeParse(String(formData.get("catalogId") ?? ""));
  if (!catalogId.success) redirect("/dashboard/syllabus?catalog=invalid");
  const { supabase, user } = await requireOwner();
  const { data, error } = await supabase.from("syllabus_catalogs").update({
    status: "retired",
  }).eq("id", catalogId.data).eq("owner_id", user.id).select("id").maybeSingle();
  if (error || !data) redirect("/dashboard/syllabus?catalog=save_failed");
  revalidatePath("/dashboard/syllabus");
  revalidatePath("/dashboard/questions");
  redirect("/dashboard/syllabus?catalog=retired");
}


export async function addSyllabusReferenceEvidence(formData: FormData) {
  const parsed = parseSyllabusEvidenceInput({
    catalogId: String(formData.get("catalogId") ?? ""),
    chapterId: String(formData.get("chapterId") ?? ""),
    topicId: String(formData.get("topicId") ?? ""),
    sourceUrl: String(formData.get("sourceUrl") ?? ""),
    sourceTitle: String(formData.get("sourceTitle") ?? ""),
    sourceLocator: String(formData.get("sourceLocator") ?? ""),
    evidenceExcerpt: String(formData.get("evidenceExcerpt") ?? ""),
  });
  if (!parsed.success) redirect("/dashboard/syllabus?evidence=invalid");

  const { supabase, user } = await requireOwner();
  const value = parsed.data;
  const { data: chapter } = await supabase.from("syllabus_chapters")
    .select("id,catalog_id").eq("id", value.chapterId)
    .eq("catalog_id", value.catalogId).eq("owner_id", user.id).maybeSingle();
  if (!chapter) redirect("/dashboard/syllabus?evidence=not_found");

  const { data: catalog } = await supabase.from("syllabus_catalogs")
    .select("status").eq("id", value.catalogId).eq("owner_id", user.id).maybeSingle();
  if (!catalog) redirect("/dashboard/syllabus?evidence=not_found");
  if (catalog.status !== "draft") redirect("/dashboard/syllabus?evidence=catalog_locked");

  if (value.topicId) {
    const { data: topic } = await supabase.from("syllabus_topics")
      .select("id").eq("id", value.topicId).eq("chapter_id", chapter.id)
      .eq("owner_id", user.id).maybeSingle();
    if (!topic) redirect("/dashboard/syllabus?evidence=not_found");
  }

  const { error } = await supabase.from("syllabus_reference_evidence").insert({
    catalog_id: value.catalogId,
    chapter_id: value.chapterId,
    topic_id: value.topicId || null,
    source_url: value.sourceUrl,
    source_title: value.sourceTitle,
    source_locator: value.sourceLocator || null,
    evidence_excerpt: value.evidenceExcerpt || null,
  });
  if (error) redirect("/dashboard/syllabus?evidence=save_failed");

  revalidatePath("/dashboard/syllabus");
  revalidatePath("/dashboard/questions");
  redirect("/dashboard/syllabus?evidence=added");
}
