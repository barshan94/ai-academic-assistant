"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function setQuestionReviewStatus(formData: FormData) {
  const questionId = z.string().uuid().safeParse(formData.get("questionId") ?? "");
  const status = z.enum(["approved", "rejected"]).safeParse(formData.get("status") ?? "");
  if (!questionId.success || !status.success) {
    redirect("/dashboard/questions?review=invalid");
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data, error } = await supabase.from("questions")
    .update({ review_status: status.data })
    .eq("id", questionId.data)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  redirect("/dashboard/questions?review=" + (error || !data ? "failed" : "updated"));
}
