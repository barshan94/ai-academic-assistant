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

  let query = supabase.from("questions")
    .select("id")
    .eq("owner_id", user.id)
    .eq("review_status", "approved");
  if (parsed.data.subject) query = query.eq("subject", parsed.data.subject);
  if (parsed.data.chapter) query = query.eq("chapter", parsed.data.chapter);
  if (parsed.data.topic) query = query.eq("topic", parsed.data.topic);

  const { data: eligible, error } = await query.limit(500);
  if (error || !eligible?.length) redirect("/dashboard/practice?create=no-questions");
  if (eligible.length < parsed.data.count) redirect("/dashboard/practice?create=not-enough");

  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  const questionIds = shuffled.slice(0, parsed.data.count).map((item) => item.id);
  const db = supabase as unknown as SupabaseClient<DatabaseWithPractice>;
  const { data: setId, error: createError } = await db.rpc("create_practice_set", {
    p_title: parsed.data.title,
    p_question_ids: questionIds,
  });
  if (createError || !setId) redirect("/dashboard/practice?create=failed");

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
  const { error } = await db.rpc("record_practice_answer", {
    p_item_id: parsed.data.itemId,
    p_outcome: parsed.data.outcome,
    p_response_notes: parsed.data.notes || null,
  });
  if (error) redirect("/dashboard/practice/" + parsed.data.setId + "?save=failed");
  revalidatePath("/dashboard/practice/" + parsed.data.setId);
  revalidatePath("/dashboard/practice");
  redirect("/dashboard/practice/" + parsed.data.setId + "?save=updated");
}
