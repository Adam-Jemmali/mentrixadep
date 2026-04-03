import { test, expect } from "@playwright/test";

test.describe("Sign in", () => {
  test("shows sign-in form", async ({ page }) => {
    await page.goto("/auth/signin");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });
});

test.describe("Sign up", () => {
  test("shows role choice and registration form", async ({ page }) => {
    await page.goto("/auth/signup");
    await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: /I want to learn/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /I want to teach/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });
});

test.describe("Auth flows (staging / manual)", () => {
  test("student: email verification → role select → dashboard", async () => {
    test.skip(
      true,
      "Requires Supabase inbox or magic link; run manually or with Mailosaur in CI."
    );
  });

  test("tutor: signup → pending approval → admin approves → tutor home", async () => {
    test.skip(true, "Requires admin E2E user and approval action; use integration or manual QA.");
  });
});
