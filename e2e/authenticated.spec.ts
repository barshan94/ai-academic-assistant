import { expect, test, type Page } from "@playwright/test";

const config = {
  ownerEmail: process.env.E2E_OWNER_EMAIL ?? "",
  ownerPassword: process.env.E2E_OWNER_PASSWORD ?? "",
  teacherEmail: process.env.E2E_TEACHER_EMAIL ?? "",
  teacherPassword: process.env.E2E_TEACHER_PASSWORD ?? "",
  questionId: process.env.E2E_QUESTION_ID ?? "",
  solutionId: process.env.E2E_SOLUTION_ID ?? "",
};

const configured = Object.values(config).every(Boolean);

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard(?:$|\?)/);
}

test("two-account teacher invitation, review, and revocation lifecycle", async ({ browser }) => {
  test.skip(!configured, "Requires dedicated Supabase E2E project credentials and seeded question/solution IDs.");

  const ownerContext = await browser.newContext();
  const teacherContext = await browser.newContext();
  const owner = await ownerContext.newPage();
  const teacher = await teacherContext.newPage();
  const questionUrl = `/dashboard/questions/${config.questionId}`;

  try {
    // The invited account must not see the owner's question before acceptance.
    await signIn(teacher, config.teacherEmail, config.teacherPassword);
    const deniedBeforeInvite = await teacher.goto(questionUrl);
    expect(deniedBeforeInvite?.status()).toBe(404);

    // Owner creates a question-scoped invitation.
    await signIn(owner, config.ownerEmail, config.ownerPassword);
    await owner.goto(questionUrl);
    await expect(owner.getByRole("heading", { name: "Question workspace." })).toBeVisible();
    await owner.getByLabel("Teacher account email").fill(config.teacherEmail);
    await owner.getByRole("button", { name: /create teacher invitation/i }).click();
    await expect(owner).toHaveURL(/invite=created/);

    // Teacher explicitly accepts the invitation using the matching account.
    await teacher.goto("/dashboard/teacher-invites");
    await expect(teacher.getByRole("heading", { name: "Teacher invitations." })).toBeVisible();
    await teacher.getByRole("button", { name: /accept invitation/i }).click();
    await expect(teacher).toHaveURL(new RegExp(`/dashboard/questions/${config.questionId}\\?invite=accepted`));
    await expect(teacher.getByRole("heading", { name: "Answer draft" })).toBeVisible();

    // Teacher records a correction; this must not overwrite the saved AI answer.
    await teacher.locator("#review-decision").selectOption("needs_correction");
    await teacher.locator("#review-notes").fill("E2E review: explain the intermediate step more clearly.");
    await teacher.getByRole("button", { name: /save review record/i }).click();
    await expect(teacher).toHaveURL(/review=needs_correction/);
    await expect(teacher.getByRole("status")).toContainText(/correction feedback was saved/i);

    // Owner can see the independent teacher review and revoke access.
    await owner.goto(questionUrl);
    await expect(owner.getByText(/teacher requested corrections/i)).toBeVisible();
    await owner.getByRole("button", { name: "Revoke access" }).click();
    await expect(owner).toHaveURL(/invite=revoked/);

    // Revocation must remove the teacher's access even in an already signed-in session.
    const deniedAfterRevoke = await teacher.goto(questionUrl);
    expect(deniedAfterRevoke?.status()).toBe(404);
  } finally {
    await ownerContext.close();
    await teacherContext.close();
  }
});
