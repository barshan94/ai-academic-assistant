import { expect, test } from "@playwright/test";

test("public landing page renders the academic workspace", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /turn questions into/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", "/login");
  await expect(page.getByText("Physics", { exact: true })).toBeVisible();
});

test("login page exposes accessible email and password fields", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  await expect(page.getByLabel("Email address")).toHaveAttribute("type", "email");
  await expect(page.getByLabel("Password")).toHaveAttribute("type", "password");
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
});

test("protected dashboard redirects to login when auth is unconfigured", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?error=configuration$/);
  await expect(page.locator("p.auth-error")).toContainText(/authentication is not configured/i);
});

test("teacher invitations page is protected when auth is unconfigured", async ({ page }) => {
  await page.goto("/dashboard/teacher-invites");
  await expect(page).toHaveURL(/\/login\?error=configuration$/);
  await expect(page.locator("p.auth-error")).toContainText(/authentication is not configured/i);
});

test("all workspace modules fail closed when Supabase auth is unconfigured", async ({ page }) => {
  const protectedRoutes = [
    "/dashboard/documents",
    "/dashboard/questions",
    "/dashboard/chapters",
    "/dashboard/syllabus",
    "/dashboard/revision",
    "/dashboard/practice",
    "/dashboard/study-plan",
    "/dashboard/teacher-invites",
  ];

  for (const route of protectedRoutes) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login\?error=configuration$/);
    await expect(page.locator("p.auth-error")).toContainText(/authentication is not configured/i);
  }
});

test("resumable upload endpoints reject cross-site requests before processing", async ({ page }) => {
  await page.goto("/");
  const startUrl = new URL("/api/documents/upload/resumable/start", page.url()).toString();
  const chunkUrl = new URL("/api/documents/upload/resumable/chunk", page.url()).toString();

  const start = await page.request.post(startUrl, {
    headers: { origin: "https://attacker.invalid", "content-type": "application/json" },
    data: { fileName: "forged.pdf", fileSizeBytes: 1024, sha256: "a".repeat(64), pageCount: null },
  });
  const chunk = await page.request.post(chunkUrl, {
    headers: { origin: "https://attacker.invalid", "x-upload-session": "forged", "content-range": "bytes */1024" },
  });

  expect(start.status()).toBe(403);
  expect(chunk.status()).toBe(403);
});

test("application responses include baseline browser security headers", async ({ page }) => {
  const response = await page.goto("/");
  expect(response).not.toBeNull();
  const headers = response!.headers();

  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["strict-transport-security"]).toContain("max-age=63072000");
});

test("keyboard navigation exposes the skip link and visible focus", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toHaveAttribute("href", "#main-content");
  const focusStyle = await skipLink.evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(focusStyle).not.toBe("none");
});
