import { test, expect, type Page } from "@playwright/test";

test.setTimeout(60_000);
const SIGN_IN_VISIBILITY_TIMEOUT = 15_000;

function passwordField(page: Page) {
  return page.locator('input[name="password"]');
}

async function mockSupabaseSignUp(
  page: Page,
  options: { email: string; withSession: boolean },
) {
  await page.route("**/api/auth/signup**", async (route) => {
    const ok = true;
    const sessionEstablished = options.withSession;
    const email = options.email;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok, sessionEstablished, email }),
    });
  });
}

async function mockOnboardingApproved(page: Page) {
  await page.route("**/api/waitlist/join*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, approved: true }),
    });
  });
}

test.describe("Sign in", () => {
  test("shows sign-in form", async ({ page }) => {
    await page.goto("/auth/signin");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible({ timeout: SIGN_IN_VISIBILITY_TIMEOUT });
    await expect(page.getByText(/continue with google/i).first()).toBeVisible({ timeout: SIGN_IN_VISIBILITY_TIMEOUT });
    await expect(page.getByRole("textbox", { name: /^email$/i })).toBeVisible({ timeout: SIGN_IN_VISIBILITY_TIMEOUT });
    await expect(passwordField(page)).toBeVisible({ timeout: SIGN_IN_VISIBILITY_TIMEOUT });
  });
});

test.describe("Sign up", () => {
  test("shows role choice and registration form", async ({ page }) => {
    await page.goto("/auth/signup");
    await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: /become a mentrixer|i want to learn/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /i want to be a guide|i want to teach/i })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /^email$/i })).toBeVisible();
  });
});

test.describe("Auth flows (CI-safe fixtures)", () => {
  test("student signup shows verification checkpoint with mocked signup response", async ({ page }) => {
    await mockOnboardingApproved(page);
    await mockSupabaseSignUp(page, {
      email: "student.e2e@example.com",
      // Activation-link flow should keep the user signed out until email verification.
      withSession: false,
    });

    await page.goto("/auth/signup");
    await page.getByRole("textbox", { name: /^email$/i }).fill("student.e2e@example.com");
    const ageCheckbox = page.getByRole("checkbox", { name: /13 years old or older/i });
    await expect(ageCheckbox).toBeVisible();
    await ageCheckbox.check({ force: true });
    await page.getByRole("button", { name: /continue with email/i }).click();

    await expect(page.getByRole("heading", { name: /check your email to continue/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /back to sign in/i })).toBeVisible();
    await expect(page.getByText(/student\.e2e@example\.com/i)).toBeVisible();
  });

  test("tutor signup shows pending-approval messaging without session", async ({ page }) => {
    await mockOnboardingApproved(page);
    await mockSupabaseSignUp(page, {
      email: "tutor.e2e@example.com",
      withSession: false,
    });

    await page.goto("/auth/signup");
    await page.getByRole("button", { name: /i want to be a guide|i want to teach/i }).first().click();
    await page.getByRole("textbox", { name: /^email$/i }).fill("tutor.e2e@example.com");
    const ageCheckbox = page.getByRole("checkbox", { name: /13 years old or older/i });
    await expect(ageCheckbox).toBeVisible();
    await ageCheckbox.check({ force: true });
    await page.getByRole("button", { name: /continue with email/i }).click();

    await expect(page.getByRole("heading", { name: /check your email to continue/i })).toBeVisible();
    await expect(page.getByText(/admin approval rules still apply for guide onboarding/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /back to sign in/i })).toBeVisible();
  });
});
