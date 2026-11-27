import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getPublicSupabaseEnv } from "./env";
import { supabaseFetch, type SupabaseFetchOptions } from "./fetch";

export function createSupabaseServiceRoleClient(options: SupabaseFetchOptions = {}) {
  const { NEXT_PUBLIC_SUPABASE_URL } = getPublicSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }

  return createClient<Database>(NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (input, init) => supabaseFetch(input, init, options),
    },
  });
}
