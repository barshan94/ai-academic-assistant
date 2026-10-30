"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const catalogSchema = z.object({
  board: z.string().trim().min(1).max(100),
  qualification: z.string().trim().min(1).max(100),
  subject: z.string().trim().min(1).max(120),
  version: z.string().trim().min(1).max(80),
  effectiveFrom: z.string().trim().max(10),
  effectiveTo: z.string().trim().max(10),
  sourceUrl: z.string().trim().max(2048).refine((value) => {
    if (!value) return true;
    try { return new URL(value).protocol === "https:"; }
    catch { return false; }
  }),
  sourceTitle: z.string().trim().max(200),
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
    status: "draft",
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
    .select("id").eq("id", value.catalogId).eq("owner_id", user.id).maybeSingle();
  if (!catalog) redirect("/dashboard/syllabus?chapter=not_found");

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
    .select("id").eq("id", value.chapterId).eq("owner_id", user.id).maybeSingle();
  if (!chapter) redirect("/dashboard/syllabus?topic=not_found");

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
  }).eq("id", catalogId.data).eq("owner_id", user.id).not("source_url", "is", null)
    .select("id").maybeSingle();
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
