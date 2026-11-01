"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DatabaseWithPractice } from "@/types/practice-database";
import type { SupabaseClient } from "@supabase/supabase-js";

const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
  subject: z.string().trim().max(120).optional(),
  chapter: z.string().trim().max(160).optional(),
  topic: z.string().trim().max(160).optional(),
  count: z.coerce.number().int().min(1).max(50),
});

export async function createPracticeSet(formData: FormData) {
  const parsed = createSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    chapter: String(formData.get("chapter") ?? ""),
    topic: String(formData.get("topic") ?? ""),
    count: String(formData.get("count") ?? "10"),
  });
  if (!parsed.success) redirect("/dashboard/practice?create=invalid");

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const db = supabase as unknown as SupabaseClient<DatabaseWithPractice>;
  const { data: setId, error: createError } = await db.rpc("create_practice_set_from_filters", {
    p_title: parsed.data.title,
    p_count: parsed.data.count,
    p_subject: parsed.data.subject || null,
    p_chapter: parsed.data.chapter || null,
    p_topic: parsed.data.topic || null,
  });

  if (createError || !setId) {
    const reason = createError?.message ?? "";
    if (reason.includes("No approved questions match")) {
      redirect("/dashboard/practice?create=no-questions");
    }
    if (reason.includes("Not enough matching approved questions")) {
      redirect("/dashboard/practice?create=not-enough");
    }
    redirect("/dashboard/practice?create=failed");
  }

  revalidatePath("/dashboard/practice");
  redirect("/dashboard/practice/" + setId);
}

const answerSchema = z.object({
  itemId: z.string().uuid(),
  outcome: z.enum(["correct", "partial", "incorrect", "skipped"]),
  notes: z.string().max(4000),
  setId: z.string().uuid(),
});

export async function recordPracticeAnswer(formData: FormData) {
  const parsed = answerSchema.safeParse({
    itemId: String(formData.get("itemId") ?? ""),
    outcome: String(formData.get("outcome") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    setId: String(formData.get("setId") ?? ""),
  });
  if (!parsed.success) redirect("/dashboard/practice?answer=invalid");

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const db = supabase as unknown as SupabaseClient<DatabaseWithPractice>;
  const { data: item, error: itemError } = await db.from("practice_set_items")
    .select("practice_set_id")
    .eq("id", parsed.data.itemId)
    .eq("practice_set_id", parsed.data.setId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (itemError || !item) redirect("/dashboard/practice?answer=not_found");

  const setId = item.practice_set_id;
  const { error } = await db.rpc("record_practice_answer", {
    p_item_id: parsed.data.itemId,
    p_outcome: parsed.data.outcome,
    p_response_notes: parsed.data.notes || null,
  });
  if (error) redirect("/dashboard/practice/" + setId + "?save=failed");
  revalidatePath("/dashboard/practice/" + setId);
  revalidatePath("/dashboard/practice");
  redirect("/dashboard/practice/" + setId + "?save=updated");
}


const practiceRevisionSchema = z.object({
  itemId: z.string().uuid(),
  setId: z.string().uuid(),
  confidence: z.coerce.number().int().min(1).max(5),
});

export async function schedulePracticeQuestionRevision(formData: FormData) {
  const parsed = practiceRevisionSchema.safeParse({
    itemId: String(formData.get("itemId") ?? ""),
    setId: String(formData.get("setId") ?? ""),
    confidence: String(formData.get("confidence") ?? ""),
  });
  if (!parsed.success) redirect("/dashboard/practice?revision=invalid");

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const db = supabase as unknown as SupabaseClient<DatabaseWithPractice>;
  // Resolve the question from the owner-scoped saved item, never from a client-supplied question ID.
  const { data: item, error: itemError } = await db.from("practice_set_items")
    .select("question_id,outcome")
    .eq("id", parsed.data.itemId)
    .eq("practice_set_id", parsed.data.setId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (itemError || !item?.question_id || !item.outcome) {
    redirect("/dashboard/practice/" + parsed.data.setId + "?revision=failed");
  }

  // This is an explicit learner choice. Practice outcomes never set confidence automatically.
  const { error } = await db.rpc("record_question_revision", {
    p_question_id: item.question_id,
    p_confidence: parsed.data.confidence,
  });
  if (error) redirect("/dashboard/practice/" + parsed.data.setId + "?revision=failed");

  revalidatePath("/dashboard/revision");
  revalidatePath("/dashboard/revision/insights");
  revalidatePath("/dashboard/practice/" + parsed.data.setId);
  redirect("/dashboard/practice/" + parsed.data.setId + "?revision=scheduled");
}
