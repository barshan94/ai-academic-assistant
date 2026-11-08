import { beforeEach, describe, expect, it, vi } from "vitest";

const { supabase, redirectMock, revalidatePathMock } = vi.hoisted(() => ({
  supabase: {
    auth: { getUser: vi.fn() },
    rpc: vi.fn(),
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

import { updateQuizDraftQuestion, updateQuizDraftStatus } from "@/app/dashboard/quizzes/actions";

const ownerId = "11111111-1111-4111-8111-111111111111";
const quizId = "22222222-2222-4222-8222-222222222222";

describe("quiz update server-action transport failures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: ownerId } }, error: null });
  });

  it("blocks a quiz status change when its atomic RPC rejects", async () => {
    supabase.rpc.mockRejectedValueOnce(new Error("private transport detail"));
    const form = new FormData();
    form.set("quizId", quizId);
    form.set("status", "approved");

    await expect(updateQuizDraftStatus(form))
      .rejects.toThrow("NEXT_REDIRECT:/dashboard/quizzes?status=blocked");

    expect(supabase.rpc).toHaveBeenCalledOnce();
    expect(redirectMock).toHaveBeenCalledWith("/dashboard/quizzes?status=blocked");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("blocks a quiz question edit when its atomic RPC rejects", async () => {
    supabase.rpc.mockRejectedValueOnce(new Error("private transport detail"));
    const form = new FormData();
    form.set("quizId", quizId);
    form.set("questionIndex", "0");
    form.set("prompt", "What is resultant force?");
    form.set("options", "A\nB\nC\nD");
    form.set("correctAnswer", "A");
    form.set("explanation", "It is the vector sum of forces.");

    await expect(updateQuizDraftQuestion(form))
      .rejects.toThrow("NEXT_REDIRECT:/dashboard/quizzes?edit=blocked");

    expect(supabase.rpc).toHaveBeenCalledOnce();
    expect(redirectMock).toHaveBeenCalledWith("/dashboard/quizzes?edit=blocked");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
