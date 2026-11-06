"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const rawEmail = formData.get("email");
  const rawPassword = formData.get("password");
  if (typeof rawEmail !== "string" || typeof rawPassword !== "string") {
    redirect("/login?error=missing_fields");
  }
  const email = rawEmail.trim();
  const password = rawPassword;

  if (!email || !password) {
    redirect("/login?error=missing_fields");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/login?error=sign_in_failed");
  }

  redirect("/dashboard");
}
