import type { SupabaseClient } from "@supabase/supabase-js";
import type { DatabaseWithQuiz } from "@/types/quiz-database";

/**
 * Check the two tables required by the teacher quiz workspace before any
 * external AI request. The query is owner-scoped and reads only row IDs.
 * Missing schema, permission errors and transport failures all fail closed.
 */
export async function isQuizWorkspaceAvailable(
  client: SupabaseClient<DatabaseWithQuiz>,
  ownerId: string,
): Promise<boolean> {
  try {
    const [quizzes, importance] = await Promise.all([
      client.from("generated_quizzes").select("id").eq("owner_id", ownerId).limit(1),
      client.from("question_importance").select("question_id").eq("owner_id", ownerId).limit(1),
    ]);
    return !quizzes.error && !importance.error;
  } catch {
    return false;
  }
}
