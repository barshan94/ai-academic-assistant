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
