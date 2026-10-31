"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { bulkClassificationReviewSchema } from "@/lib/questions/bulk-classification-review";

export async function bulkUpdateClassificationStatus(formData: FormData) {
  const parsed = bulkClassificationReviewSchema.safeParse({
    questionIds: formData.getAll("questionIds").map(String),
    targetStatus: String(formData.get("targetStatus") ?? ""),
  });
  if (!parsed.success) redirect("/dashboard/syllabus/review?bulk=invalid");

  const { questionIds, targetStatus } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data: eligible, error: lookupError } = await supabase.from("questions")
    .select("id")
    .eq("owner_id", user.id)
    .in("id", questionIds)
    .in("classification_status", ["unreviewed", "uncertain"]);
  if (lookupError) redirect("/dashboard/syllabus/review?bulk=failed");
  if (!eligible || eligible.length !== questionIds.length) {
    redirect("/dashboard/syllabus/review?bulk=stale");
  }

  // A single conditional SQL UPDATE prevents partial batch writes. The existing
  // database trigger records a separate before/after history row per question.
  const { data: updated, error: updateError } = await supabase.from("questions")
    .update({ classification_status: targetStatus })
    .eq("owner_id", user.id)
    .in("id", questionIds)
    .in("classification_status", ["unreviewed", "uncertain"])
    .select("id");
  if (updateError) redirect("/dashboard/syllabus/review?bulk=failed");
  if (!updated || updated.length !== questionIds.length) {
    redirect("/dashboard/syllabus/review?bulk=stale");
  }

  revalidatePath("/dashboard/syllabus/review");
  revalidatePath("/dashboard/questions");
  redirect("/dashboard/syllabus/review?bulk=updated&count=" + updated.length);
}
