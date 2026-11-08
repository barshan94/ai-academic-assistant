import { beforeEach, describe, expect, it, vi } from "vitest";

const { supabase, redirectMock, revalidatePathMock } = vi.hoisted(() => ({
  supabase: {
    auth: { getUser: vi.fn() },
    rpc: vi.fn(),
    from: vi.fn(),
  },
  redirectMock: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  revalidatePathMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => supabase),
}));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

import { createChapterNoteDraft, updateChapterNoteStatus } from "@/app/dashboard/chapters/actions";

const ownerId = "11111111-1111-4111-8111-111111111111";
const catalogId = "22222222-2222-4222-8222-222222222222";
const chapterId = "33333333-3333-4333-8333-333333333333";
const questionId = "44444444-4444-4444-8444-444444444444";
const noteId = "55555555-5555-4555-8555-555555555555";

function draftForm(): FormData {
  const form = new FormData();
  form.set("catalogId", catalogId);
  form.set("chapterId", chapterId);
  form.set("title", "Forces");
  form.set("summary", "Core ideas");
  form.set("concepts", "Inertia");
  form.append("questionIds", questionId);
  return form;
}

describe("chapter note server-action persistence failures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: ownerId } }, error: null });
  });

  it("fails closed when the atomic draft RPC rejects at the transport layer", async () => {
    supabase.rpc.mockRejectedValueOnce(new Error("private transport detail"));

    await expect(createChapterNoteDraft(draftForm()))
      .rejects.toThrow("NEXT_REDIRECT:/dashboard/chapters?create=save_failed");

    expect(supabase.rpc).toHaveBeenCalledOnce();
    expect(redirectMock).toHaveBeenCalledWith("/dashboard/chapters?create=save_failed");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("does not report a note status update as successful when the update request rejects", async () => {
    supabase.from.mockReturnValue({
      update: () => ({
        eq: () => ({
          eq: () => ({
            select: () => ({
              maybeSingle: vi.fn().mockRejectedValue(new Error("private transport detail")),
            }),
          }),
        }),
      }),
    });

    const form = new FormData();
    form.set("noteId", noteId);
    form.set("status", "approved");

    await expect(updateChapterNoteStatus(form))
      .rejects.toThrow("NEXT_REDIRECT:/dashboard/chapters?status=blocked");

    expect(redirectMock).toHaveBeenCalledWith("/dashboard/chapters?status=blocked");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
