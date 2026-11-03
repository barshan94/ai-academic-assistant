import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

const config = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  ownerEmail: process.env.E2E_OWNER_EMAIL ?? "",
  ownerPassword: process.env.E2E_OWNER_PASSWORD ?? "",
  teacherEmail: process.env.E2E_TEACHER_EMAIL ?? "",
  teacherPassword: process.env.E2E_TEACHER_PASSWORD ?? "",
};

const configured = Object.values(config).every(Boolean);

type TestFixture = {
  supabase: SupabaseClient;
  ownerId: string;
  documentId: string;
  pageId: string;
  questionId: string;
  solutionId: string;
};

const answerFixture = {
  examAnswer: "A test answer created only for the authenticated browser acceptance.",
  workingSteps: [{ step: "Test step", explanation: "A deterministic fixture step." }],
  calculationChecks: [],
  chemistryChecks: [],
  physicsChecks: [],
  bengaliExplanation: "এটি কেবল স্বয়ংক্রিয় পরীক্ষার জন্য তৈরি একটি নমুনা উত্তর।",
  englishExplanation: "This is a deterministic answer fixture for the automated test.",
  keyConcepts: ["E2E fixture"],
  assumptions: [],
  limitations: ["Not an academic answer; test data only."],
};

async function createTestFixture(): Promise<TestFixture> {
  const supabase = createClient(config.supabaseUrl, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
    email: config.ownerEmail,
    password: config.ownerPassword,
  });
  if (authError || !auth.user) {
    throw new Error("Could not authenticate the E2E owner to create isolated test records.");
  }

  let documentId: string | undefined;
  let pageId: string | undefined;
  let questionId: string | undefined;
  try {
    const marker = randomUUID();
    const { data: document, error: documentError } = await supabase
      .from("documents")
      .insert({
        owner_id: auth.user.id,
        file_name: "E2E fixture " + marker + ".pdf",
        mime_type: "application/pdf",
        file_size_bytes: 1,
        status: "ready",
        page_count: 1,
      })
      .select("id")
      .single();
    if (documentError || !document) throw new Error("Could not create the isolated E2E document fixture.");
    documentId = document.id;

    const { data: page, error: pageError } = await supabase
      .from("document_pages")
      .insert({
        owner_id: auth.user.id,
        document_id: documentId,
        page_number: 1,
        extracted_text: "E2E fixture source page. No real student or customer content.",
        extraction_method: "manual",
        status: "complete",
      })
      .select("id")
      .single();
    if (pageError || !page) throw new Error("Could not create the isolated E2E page fixture.");
    pageId = page.id;

    const { data: question, error: questionError } = await supabase
      .from("questions")
      .insert({
        owner_id: auth.user.id,
        document_id: documentId,
        document_page_id: page.id,
        question_number: "E2E",
        question_text: "E2E fixture: explain why automated acceptance tests use isolated records.",
        board: "Test Board",
        qualification: "Test",
        subject: "Computer Science",
        chapter: "Automated testing",
        topic: "Isolated fixtures",
        review_status: "approved",
      })
      .select("id")
      .single();
    if (questionError || !question) throw new Error("Could not create the isolated E2E question fixture.");
    questionId = question.id;

    const { data: solution, error: solutionError } = await supabase
      .from("question_solutions")
      .insert({
        owner_id: auth.user.id,
        question_id: questionId,
        provider: "e2e-fixture",
        model: "deterministic-test",
        prompt_version: "authenticated-e2e-fixture-v1",
        answer_json: answerFixture,
        // verification_status is intentionally omitted: the database default
        // creates a generated draft, and authenticated clients cannot set it.
      })
      .select("id")
      .single();
    if (solutionError || !solution) throw new Error("Could not create the isolated E2E answer fixture.");

    return { supabase, ownerId: auth.user.id, documentId, pageId, questionId, solutionId: solution.id };
  } catch (error) {
    if (questionId) await supabase.from("questions").delete().eq("id", questionId);
    if (documentId) await supabase.from("documents").delete().eq("id", documentId);
    await supabase.auth.signOut();
    throw error;
  }
}

async function cleanupTestFixture(fixture: TestFixture) {
  // Delete only the unique question/document created by this test. Cascades
  // remove its solution and invitation/review children; unrelated records stay.
  await fixture.supabase.from("questions").delete().eq("id", fixture.questionId);
  await fixture.supabase.from("documents").delete().eq("id", fixture.documentId);
  await fixture.supabase.auth.signOut();
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard(?:$|\?)/);
}

test("two-account teacher invitation, review, and revocation lifecycle", async ({ browser }) => {
  test.skip(!configured, "Requires the six Supabase URL/key and owner/teacher credential secrets.");
  if (!configured) return;

  const fixture = await createTestFixture();
  const teacherApi = createClient(config.supabaseUrl, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const ownerContext = await browser.newContext();
  const teacherContext = await browser.newContext();
  const owner = await ownerContext.newPage();
  const teacher = await teacherContext.newPage();
  const questionUrl = `/dashboard/questions/${fixture.questionId}`;

  try {
    const { data: teacherAuth, error: teacherAuthError } = await teacherApi.auth.signInWithPassword({
      email: config.teacherEmail,
      password: config.teacherPassword,
    });
    if (teacherAuthError || !teacherAuth.user) {
      throw new Error("Could not authenticate the teacher API client for cross-account checks.");
    }

    // Before an invitation exists, the teacher must not see any owner fixture.
    const [privateDocumentBefore, privatePageBefore, privateQuestionBefore, privateSolutionBefore] =
      await Promise.all([
        teacherApi.from("documents").select("id").eq("id", fixture.documentId),
        teacherApi.from("document_pages").select("id").eq("id", fixture.pageId),
        teacherApi.from("questions").select("id").eq("id", fixture.questionId),
        teacherApi.from("question_solutions").select("id").eq("id", fixture.solutionId),
      ]);
    for (const result of [privateDocumentBefore, privatePageBefore, privateQuestionBefore, privateSolutionBefore]) {
      expect(result.error).toBeNull();
      expect(result.data).toEqual([]);
    }

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
    await expect(teacher).toHaveURL(new RegExp(`/dashboard/questions/${fixture.questionId}\\?invite=accepted`));
    await teacher.goto(`${questionUrl}?solution=${fixture.solutionId}`);
    await expect(teacher.getByRole("heading", { name: "Answer draft", exact: true })).toBeVisible();

    // Invitation grants question/answer access only, not the original source document/page.
    const [sharedQuestion, sharedSolution, privateDocumentAfterInvite, privatePageAfterInvite] =
      await Promise.all([
        teacherApi.from("questions").select("id,owner_id").eq("id", fixture.questionId).maybeSingle(),
        teacherApi.from("question_solutions").select("id,owner_id").eq("id", fixture.solutionId).maybeSingle(),
        teacherApi.from("documents").select("id").eq("id", fixture.documentId),
        teacherApi.from("document_pages").select("id,extracted_text").eq("id", fixture.pageId),
      ]);
    expect(sharedQuestion.error).toBeNull();
    expect(sharedQuestion.data).toMatchObject({ id: fixture.questionId, owner_id: fixture.ownerId });
    expect(sharedSolution.error).toBeNull();
    expect(sharedSolution.data).toMatchObject({ id: fixture.solutionId, owner_id: fixture.ownerId });
    expect(privateDocumentAfterInvite.error).toBeNull();
    expect(privateDocumentAfterInvite.data).toEqual([]);
    expect(privatePageAfterInvite.error).toBeNull();
    expect(privatePageAfterInvite.data).toEqual([]);

    // An accepted teacher can approve a draft through the independent
    // verification RPC; the saved answer must show teacher_verified.
    await teacher.locator("#review-decision").selectOption("approved");
    await teacher.getByRole("button", { name: /save review record/i }).click();
    await expect(teacher).toHaveURL(/review=approved/);
    await expect(teacher.locator("span.document-status", { hasText: "teacher verified" })).toBeVisible();

    // A later correction review is append-only and removes the verification label.
    await teacher.locator("#review-decision").selectOption("needs_correction");
    await teacher.locator("#review-notes").fill("E2E review: explain the intermediate step more clearly.");
    await teacher.getByRole("button", { name: /save review record/i }).click();
    await expect(teacher).toHaveURL(/review=needs_correction/);
    await expect(teacher.getByRole("status")).toContainText(/correction feedback was saved/i);
    await expect(teacher.getByText("generated", { exact: true })).toBeVisible();

    // Owner can see the independent teacher review and revoke access.
    await owner.goto(questionUrl);
    await expect(owner.getByText(/teacher requested corrections/i)).toBeVisible();
    await owner.getByRole("button", { name: "Revoke access" }).click();
    await expect(owner).toHaveURL(/invite=revoked/);

    // Revocation must remove the teacher's access even in an already signed-in session.
    const deniedAfterRevoke = await teacher.goto(questionUrl);
    expect(deniedAfterRevoke?.status()).toBe(404);

    // Revocation must also remove the teacher's direct Data API access.
    const [revokedQuestion, revokedSolution] = await Promise.all([
      teacherApi.from("questions").select("id").eq("id", fixture.questionId),
      teacherApi.from("question_solutions").select("id").eq("id", fixture.solutionId),
    ]);
    expect(revokedQuestion.error).toBeNull();
    expect(revokedQuestion.data).toEqual([]);
    expect(revokedSolution.error).toBeNull();
    expect(revokedSolution.data).toEqual([]);
  } finally {
    await ownerContext.close();
    await teacherContext.close();
    await teacherApi.auth.signOut();
    await cleanupTestFixture(fixture);
  }
});
