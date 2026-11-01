import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AIGenerationQuotaResult = "allowed" | "limited" | "unavailable";

export async function consumeAIGenerationQuota(
  supabase: SupabaseClient,
  bucket: "ai-solution" | "ai-chapter-note",
): Promise<AIGenerationQuotaResult> {
  const { data, error } = await supabase.rpc("consume_ai_generation_quota", {
    p_bucket: bucket,
  });

  if (error || typeof data !== "boolean") return "unavailable";
  return data ? "allowed" : "limited";
}
