"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const httpsUrl = z.string().trim().max(2048).refine((value) => {
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; }
  catch { return false; }
}, "A valid HTTPS source URL is required.");

const dateOnly = z.string().trim().max(10).refine((value) => {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
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
  sourceUrl: z.string().trim().max(2048).refine((value) => !value || (() => {
    try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; }
  })()),
  sourceTitle: z.string().trim().max(200),
  sourceCheckedAt: dateOnly,
}).superRefine((value, context) => {
  if (value.effectiveFrom && value.effectiveTo && value.effectiveTo < value.effectiveFrom) {
    context.addIssue({
      code: "custom",
      path: ["effectiveTo"],
      message: "The end date must not be earlier than the start date.",
    });
  }
});

const sourceUpdateSchema = z.object({
  catalogId: z.string().uuid(),
  sourceUrl: z.string().trim().max(2048).refine((value) => !value || (() => {
    try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; }
  })()),
  sourceTitle: z.string().trim().max(200),
  sourceCheckedAt: dateOnly,
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

const evidenceSchema = z.object({
  catalogId: z.string().uuid(),
  chapterId: z.string().uuid(),
  topicId: z.string().uuid().or(z.literal("")),
  sourceUrl: httpsUrl,
  sourceTitle: z.string().trim().min(1).max(200),
  sourceLocator: z.string().trim().max(200),
  evidenceExcerpt: z.string().trim().max(600),
});

async function requirePlatformAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  const { data: isAdmin, error } = await supabase.rpc("is_platform_admin");
  if (error || !isAdmin) redirect("/dashboard/syllabus/references?error=admin");
  return supabase;
}

function refreshReferencePages(catalogId?: string) {
  revalidatePath("/dashboard/syllabus/references");
  revalidatePath("/dashboard/syllabus/references/manage");
  if (catalogId) revalidatePath("/dashboard/syllabus/references/" + catalogId);
  revalidatePath("/dashboard/syllabus");
}

export async function createReferenceCatalog(formData: FormData) {
  const parsed = catalogSchema.safeParse({
    board: String(formData.get("board") ?? ""),
    qualification: String(formData.get("qualification") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    version: String(formData.get("version") ?? ""),
    effectiveFrom: String(formData.get("effectiveFrom") ?? ""),
    effectiveTo: String(formData.get("effectiveTo") ?? ""),
    sourceUrl: String(formData.get("sourceUrl") ?? ""),
    sourceTitle: String(formData.get("sourceTitle") ?? ""),
    sourceCheckedAt: String(formData.get("sourceCheckedAt") ?? ""),
  });
  if (!parsed.success) redirect("/dashboard/syllabus/references/manage?result=invalid");

  const supabase = await requirePlatformAdmin();
  const value = parsed.data;
  const { error } = await supabase.from("reference_syllabus_catalogs").insert({
    board: value.board,
    qualification: value.qualification,
    subject: value.subject,
    version: value.version,
    effective_from: value.effectiveFrom || null,
    effective_to: value.effectiveTo || null,
    source_url: value.sourceUrl || null,
    source_title: value.sourceTitle || null,
    source_checked_at: value.sourceCheckedAt ? new Date(value.sourceCheckedAt + "T00:00:00.000Z").toISOString() : null,
  });
  if (error) redirect("/dashboard/syllabus/references/manage?result=" + (error.code === "23505" ? "duplicate" : "save_failed"));
  refreshReferencePages();
  redirect("/dashboard/syllabus/references/manage?result=created");
}

export async function updateReferenceCatalogSource(formData: FormData) {
  const parsed = sourceUpdateSchema.safeParse({
    catalogId: String(formData.get("catalogId") ?? ""),
    sourceUrl: String(formData.get("sourceUrl") ?? ""),
    sourceTitle: String(formData.get("sourceTitle") ?? ""),
    sourceCheckedAt: String(formData.get("sourceCheckedAt") ?? ""),
  });
  if (!parsed.success) redirect("/dashboard/syllabus/references/manage?result=invalid");
  const supabase = await requirePlatformAdmin();
  const value = parsed.data;
  const { data, error } = await supabase.from("reference_syllabus_catalogs")
    .update({
      source_url: value.sourceUrl || null,
      source_title: value.sourceTitle || null,
      source_checked_at: value.sourceCheckedAt ? new Date(value.sourceCheckedAt + "T00:00:00.000Z").toISOString() : null,
    })
    .eq("id", value.catalogId).eq("status", "draft").select("id").maybeSingle();
  if (error || !data) redirect("/dashboard/syllabus/references/manage?result=save_failed");
  refreshReferencePages(value.catalogId);
  redirect("/dashboard/syllabus/references/manage?result=source_updated");
}

export async function createReferenceChapter(formData: FormData) {
  const parsed = chapterSchema.safeParse({
    catalogId: String(formData.get("catalogId") ?? ""),
    title: String(formData.get("title") ?? ""),
    code: String(formData.get("code") ?? ""),
    sortOrder: String(formData.get("sortOrder") ?? "0"),
  });
  if (!parsed.success) redirect("/dashboard/syllabus/references/manage?result=invalid");
  const supabase = await requirePlatformAdmin();
  const value = parsed.data;
  const { data: catalog, error: catalogError } = await supabase.from("reference_syllabus_catalogs")
    .select("id,status").eq("id", value.catalogId).maybeSingle();
  if (catalogError || !catalog) redirect("/dashboard/syllabus/references/manage?result=not_found");
  if (catalog.status !== "draft") redirect("/dashboard/syllabus/references/manage?result=catalog_locked");
  const { error } = await supabase.from("reference_syllabus_chapters").insert({
    catalog_id: value.catalogId,
    title: value.title,
    chapter_code: value.code || null,
    sort_order: value.sortOrder,
  });
  if (error) redirect("/dashboard/syllabus/references/manage?result=" + (error.code === "23505" ? "duplicate" : "save_failed"));
  refreshReferencePages(value.catalogId);
  redirect("/dashboard/syllabus/references/manage?result=chapter_added");
}

export async function createReferenceTopic(formData: FormData) {
  const parsed = topicSchema.safeParse({
    chapterId: String(formData.get("chapterId") ?? ""),
    title: String(formData.get("title") ?? ""),
    code: String(formData.get("code") ?? ""),
    sortOrder: String(formData.get("sortOrder") ?? "0"),
  });
  if (!parsed.success) redirect("/dashboard/syllabus/references/manage?result=invalid");
  const supabase = await requirePlatformAdmin();
  const value = parsed.data;
  const { data: chapter } = await supabase.from("reference_syllabus_chapters")
    .select("id,catalog_id").eq("id", value.chapterId).maybeSingle();
  if (!chapter) redirect("/dashboard/syllabus/references/manage?result=not_found");
  const { data: catalog } = await supabase.from("reference_syllabus_catalogs")
    .select("status").eq("id", chapter.catalog_id).maybeSingle();
  if (!catalog) redirect("/dashboard/syllabus/references/manage?result=not_found");
  if (catalog.status !== "draft") redirect("/dashboard/syllabus/references/manage?result=catalog_locked");
  const { error } = await supabase.from("reference_syllabus_topics").insert({
    chapter_id: value.chapterId,
    title: value.title,
    topic_code: value.code || null,
    sort_order: value.sortOrder,
  });
  if (error) redirect("/dashboard/syllabus/references/manage?result=" + (error.code === "23505" ? "duplicate" : "save_failed"));
  refreshReferencePages(chapter.catalog_id);
  redirect("/dashboard/syllabus/references/manage?result=topic_added");
}

export async function addReferenceEvidence(formData: FormData) {
  const parsed = evidenceSchema.safeParse({
    catalogId: String(formData.get("catalogId") ?? ""),
    chapterId: String(formData.get("chapterId") ?? ""),
    topicId: String(formData.get("topicId") ?? ""),
    sourceUrl: String(formData.get("sourceUrl") ?? ""),
    sourceTitle: String(formData.get("sourceTitle") ?? ""),
    sourceLocator: String(formData.get("sourceLocator") ?? ""),
    evidenceExcerpt: String(formData.get("evidenceExcerpt") ?? ""),
  });
  if (!parsed.success) redirect("/dashboard/syllabus/references/manage?result=evidence_invalid");
  const supabase = await requirePlatformAdmin();
  const value = parsed.data;
  const { data: chapter, error: chapterError } = await supabase
    .from("reference_syllabus_chapters")
    .select("id,catalog_id")
    .eq("id", value.chapterId)
    .eq("catalog_id", value.catalogId)
    .maybeSingle();
  if (chapterError || !chapter) {
    redirect("/dashboard/syllabus/references/manage?result=evidence_invalid");
  }
  const { data: catalog, error: catalogError } = await supabase.from("reference_syllabus_catalogs")
    .select("status").eq("id", value.catalogId).maybeSingle();
  if (catalogError || !catalog) {
    redirect("/dashboard/syllabus/references/manage?result=evidence_invalid");
  }
  if (catalog.status !== "draft") {
    redirect("/dashboard/syllabus/references/manage?result=catalog_locked");
  }

  if (value.topicId) {
    const { data: topic, error: topicError } = await supabase
      .from("reference_syllabus_topics")
      .select("id")
      .eq("id", value.topicId)
      .eq("chapter_id", chapter.id)
      .maybeSingle();
    if (topicError || !topic) {
      redirect("/dashboard/syllabus/references/manage?result=evidence_invalid");
    }
  }

  const { error } = await supabase.from("reference_syllabus_evidence").insert({
    catalog_id: value.catalogId,
    chapter_id: value.chapterId,
    topic_id: value.topicId || null,
    source_url: value.sourceUrl,
    source_title: value.sourceTitle,
    source_locator: value.sourceLocator || null,
    evidence_excerpt: value.evidenceExcerpt || null,
  });
  if (error) redirect("/dashboard/syllabus/references/manage?result=evidence_failed");
  refreshReferencePages(value.catalogId);
  redirect("/dashboard/syllabus/references/manage?result=evidence_added");
}

export async function verifyReferenceCatalog(formData: FormData) {
  const catalogId = String(formData.get("catalogId") ?? "");
  if (!z.string().uuid().safeParse(catalogId).success) redirect("/dashboard/syllabus/references/manage?result=invalid");
  const supabase = await requirePlatformAdmin();
  const { data: catalog, error: catalogError } = await supabase.from("reference_syllabus_catalogs")
    .select("id,source_url,status").eq("id", catalogId).eq("status", "draft").maybeSingle();
  if (catalogError || !catalog) redirect("/dashboard/syllabus/references/manage?result=not_found");

  let sourceIsValid = false;
  try {
    const source = new URL(catalog.source_url ?? "");
    sourceIsValid = source.protocol === "https:" && Boolean(source.hostname) &&
      !source.username && !source.password;
  } catch {
    sourceIsValid = false;
  }
  if (!sourceIsValid) redirect("/dashboard/syllabus/references/manage?result=source_required");

  const { data, error } = await supabase.from("reference_syllabus_catalogs")
    .update({ status: "verified" }).eq("id", catalogId).eq("status", "draft").select("id").maybeSingle();
  if (error || !data) redirect("/dashboard/syllabus/references/manage?result=verify_failed");
  refreshReferencePages(catalogId);
  redirect("/dashboard/syllabus/references/manage?result=verified");
}

export async function retireReferenceCatalog(formData: FormData) {
  const catalogId = String(formData.get("catalogId") ?? "");
  if (!z.string().uuid().safeParse(catalogId).success) redirect("/dashboard/syllabus/references/manage?result=invalid");
  const supabase = await requirePlatformAdmin();
  const { data, error } = await supabase.from("reference_syllabus_catalogs")
    .update({ status: "retired" }).eq("id", catalogId).eq("status", "verified").select("id").maybeSingle();
  if (error || !data) redirect("/dashboard/syllabus/references/manage?result=retire_failed");
  refreshReferencePages(catalogId);
  redirect("/dashboard/syllabus/references/manage?result=retired");
}
