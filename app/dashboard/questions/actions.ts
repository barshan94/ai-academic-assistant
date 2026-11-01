"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function setQuestionReviewStatus(formData: FormData) {
  const questionId = String(formData.get("questionId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!z.string().uuid().safeParse(questionId).success || !["approved", "rejected"].includes(status)) {
    redirect("/dashboard/questions?review=invalid");
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data, error } = await supabase.from("questions")
    .update({ review_status: status })
    .eq("id", questionId)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  redirect("/dashboard/questions?review=" + (error || !data ? "failed" : "updated"));
}
