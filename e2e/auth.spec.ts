import { test, expect, type Page } from "@playwright/test";

test.setTimeout(60_000);

const SIGNIN_URL = "/auth/signin?signin=1";

function passwordField(page: Page) {
  return page.getByLabel(/^password$/i);
}

async function mockOnboardingJoin(page: Page, outcome: "approved" | "pending_review") {
  await page.route("**/api/waitlist/join**", async (route) => {
    if (outcome === "approved") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          approved: true,
          status: "approved",
          confirmationEmailSent: true,
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        status: "pending",
        confirmationEmailSent: true,
        message: "Your Guide access request is pending admin review.",
      }),
    });
  });
}

async function mockSignupApi(
  page: Page,
  options: { email: string; sessionEstablished: boolean },
) {
  await page.route("**/api/auth/signup**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        sessionEstablished: options.sessionEstablished,
        email: options.email,
      }),
    });
  });
}

test.describe("Sign in", () => {
  test("shows sign-in form", async ({ page }) => {
    await page.goto(SIGNIN_URL);
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await expect(page.getByText(/continue with google/i).first()).toBeVisible();
    await expect(page.getByRole("textbox", { name: /^email$/i })).toBeVisible();
    await expect(passwordField(page)).toBeVisible();
  });
});

test.describe("Sign up", () => {
  test("shows role choice and registration form", async ({ page }) => {
    await page.goto("/auth/signup");
    await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: /i want to learn/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /i want to teach/i })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /^email$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /continue with email/i })).toBeVisible();
  });
});

test.describe("Auth flows (CI-safe fixtures)", () => {
  test("student signup shows activation checkpoint with mocked APIs", async ({ page }) => {
    await mockOnboardingJoin(page, "approved");
    await mockSignupApi(page, {
      email: "student.e2e@example.com",
      sessionEstablished: false,
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
    await mockOnboardingJoin(page, "approved");
    await mockSignupApi(page, {
      email: "tutor.e2e@example.com",
      sessionEstablished: false,
    });

    await page.goto("/auth/signup");
    await page.getByRole("button", { name: /i want to teach/i }).click();
    await page.getByRole("textbox", { name: /^email$/i }).fill("tutor.e2e@example.com");
    const ageCheckbox = page.getByRole("checkbox", { name: /13 years old or older/i });
    await expect(ageCheckbox).toBeVisible();
    await ageCheckbox.check({ force: true });
    await page.getByRole("button", { name: /continue with email/i }).click();

    await expect(page.getByRole("heading", { name: /check your email to continue/i })).toBeVisible();
    await expect(
      page.getByText(/admin approval rules still apply for guide onboarding/i),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /back to sign in/i })).toBeVisible();
  });
});
