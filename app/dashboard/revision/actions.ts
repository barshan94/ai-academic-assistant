"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DatabaseWithRevision } from "@/types/revision-database";
import type { SupabaseClient } from "@supabase/supabase-js";

const revisionSchema = z.object({
  questionId: z.string().uuid(),
  confidence: z.coerce.number().int().min(1).max(5),
});

export async function recordRevision(formData: FormData) {
  const parsed = revisionSchema.safeParse({
    questionId: String(formData.get("questionId") ?? ""),
    confidence: String(formData.get("confidence") ?? ""),
  });
  if (!parsed.success) redirect("/dashboard/revision?save=invalid");

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const typedSupabase = supabase as unknown as SupabaseClient<DatabaseWithRevision>;
  const { error } = await typedSupabase.rpc("record_question_revision", {
    p_question_id: parsed.data.questionId,
    p_confidence: parsed.data.confidence,
  });

  if (error) redirect("/dashboard/revision?save=failed");
  revalidatePath("/dashboard/revision");
  redirect("/dashboard/revision?save=updated");
}
