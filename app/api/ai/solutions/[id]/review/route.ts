import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({ status: z.enum(["approved", "rejected"]) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid solution ID." }, { status: 400 });
  let body: z.infer<typeof schema>;
  try { body = schema.parse(await request.json()); }
  catch { return NextResponse.json({ error: "Choose approve or reject." }, { status: 400 }); }
  const { data, error } = await supabase.from("question_solutions")
    .update({ review_status: body.status })
    .eq("id", id).eq("owner_id", user.id)
    .select("id,review_status").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Solution not found or could not be updated." }, { status: 404 });
  return NextResponse.json({ id: data.id, status: data.review_status });
}
