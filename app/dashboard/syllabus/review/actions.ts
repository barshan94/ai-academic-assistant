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

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  // The SECURITY INVOKER RPC locks and validates the entire owner-scoped batch
  // inside one transaction; any stale/inaccessible ID rolls the whole call back.
  const { data: updatedCount, error } = await supabase.rpc(
    "bulk_update_question_classification_status",
    {
      question_ids: parsed.data.questionIds,
      target_status: parsed.data.targetStatus,
    },
  );
  if (error || typeof updatedCount !== "number") {
    redirect("/dashboard/syllabus/review?bulk=failed");
  }

  revalidatePath("/dashboard/syllabus/review");
  revalidatePath("/dashboard/questions");
  redirect("/dashboard/syllabus/review?bulk=updated&count=" + updatedCount);
}
