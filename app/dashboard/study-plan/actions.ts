"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DatabaseWithStudyPlan } from "@/types/study-plan-database";
import type { SupabaseClient } from "@supabase/supabase-js";

const createSchema = z.object({
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().trim().min(1).max(120),
  plannedMinutes: z.coerce.number().int().min(5).max(480),
  notes: z.string().max(500),
  weekOffset: z.coerce.number().int().min(-52).max(52).default(0),
  sessionPage: z.coerce.number().int().min(1).max(10000).default(1),
});

export async function createStudySession(formData: FormData) {
  const parsed = createSchema.safeParse({
    sessionDate: String(formData.get("sessionDate") ?? ""),
    title: String(formData.get("title") ?? ""),
    plannedMinutes: String(formData.get("plannedMinutes") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    weekOffset: String(formData.get("weekOffset") ?? "0"),
    sessionPage: String(formData.get("sessionPage") ?? "1"),
  });
  if (!parsed.success) redirect("/dashboard/study-plan?calendar=invalid");
  const weekQuery = (parsed.data.weekOffset ? "&week=" + parsed.data.weekOffset : "") + (parsed.data.sessionPage > 1 ? "&sessionPage=" + parsed.data.sessionPage : "");

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const db = supabase as unknown as SupabaseClient<DatabaseWithStudyPlan>;
  const { error } = await db.rpc("create_weekly_study_session", {
    p_session_date: parsed.data.sessionDate,
    p_title: parsed.data.title,
    p_planned_minutes: parsed.data.plannedMinutes,
    p_notes: parsed.data.notes || null,
  });
  if (error) redirect("/dashboard/study-plan?calendar=failed" + weekQuery);

  revalidatePath("/dashboard/study-plan");
  redirect("/dashboard/study-plan?calendar=created" + weekQuery);
}

const completeSchema = z.object({ sessionId: z.string().uuid(), weekOffset: z.coerce.number().int().min(-52).max(52).default(0), sessionPage: z.coerce.number().int().min(1).max(10000).default(1) });

export async function completeStudySession(formData: FormData) {
  const parsed = completeSchema.safeParse({ sessionId: String(formData.get("sessionId") ?? ""), weekOffset: String(formData.get("weekOffset") ?? "0"), sessionPage: String(formData.get("sessionPage") ?? "1") });
  if (!parsed.success) redirect("/dashboard/study-plan?calendar=invalid");
  const weekQuery = (parsed.data.weekOffset ? "&week=" + parsed.data.weekOffset : "") + (parsed.data.sessionPage > 1 ? "&sessionPage=" + parsed.data.sessionPage : "");

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const db = supabase as unknown as SupabaseClient<DatabaseWithStudyPlan>;
  const { error } = await db.rpc("complete_weekly_study_session", { p_session_id: parsed.data.sessionId });
  if (error) redirect("/dashboard/study-plan?calendar=failed" + weekQuery);

  revalidatePath("/dashboard/study-plan");
  redirect("/dashboard/study-plan?calendar=completed" + weekQuery);
}
