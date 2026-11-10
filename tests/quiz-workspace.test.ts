import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DatabaseWithQuiz } from "@/types/quiz-database";
import { isQuizWorkspaceAvailable } from "@/lib/quiz-workspace";

type QueryResult = { error: unknown };
type QueryBehavior = QueryResult | Error;

function createClient(behavior: Record<string, QueryBehavior>) {
  const from = vi.fn((table: string) => {
    const result = behavior[table] ?? { error: null };
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      limit: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.limit.mockImplementation(async () => {
      if (result instanceof Error) throw result;
      return result;
    });
    return query;
  });
  return { client: { from } as unknown as SupabaseClient<DatabaseWithQuiz>, from };
}

describe("quiz workspace schema preflight", () => {
  it("checks both required tables with owner-scoped ID-only reads", async () => {
    const { client, from } = createClient({});
    await expect(isQuizWorkspaceAvailable(client, "owner-1")).resolves.toBe(true);
    expect(from).toHaveBeenCalledTimes(2);
    expect(from).toHaveBeenNthCalledWith(1, "generated_quizzes");
    expect(from).toHaveBeenNthCalledWith(2, "question_importance");
  });

  it.each(["generated_quizzes", "question_importance"])(
    "fails closed when the %s table is unavailable",
    async (table) => {
      const { client } = createClient({ [table]: { error: { code: "PGRST205" } } });
      await expect(isQuizWorkspaceAvailable(client, "owner-1")).resolves.toBe(false);
    },
  );

  it("fails closed when a database transport rejects", async () => {
    const { client } = createClient({ generated_quizzes: new Error("private transport detail") });
    await expect(isQuizWorkspaceAvailable(client, "owner-1")).resolves.toBe(false);
  });
});
