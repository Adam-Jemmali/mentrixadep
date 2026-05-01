import { test, expect } from "@playwright/test";

test.setTimeout(60_000);

function passwordField(page: Parameters<typeof test>[0]["page"]) {
  return page.locator('input[name="password"]');
}

function confirmPasswordField(page: Parameters<typeof test>[0]["page"]) {
  return page.locator('input[name="confirmPassword"]');
}

async function mockSupabaseSignUp(
  page: Parameters<typeof test>[0]["page"],
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

test.describe("Sign in", () => {
  test("shows sign-in form", async ({ page }) => {
    await page.goto("/auth/signin");
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
    await expect(page.getByRole("button", { name: /become a mentrixer|i want to learn/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /i want to be a guide|i want to teach/i })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /^email$/i })).toBeVisible();
  });
});

test.describe("Auth flows (CI-safe fixtures)", () => {
  test("student signup shows verification checkpoint with mocked signup response", async ({ page }) => {
    await mockSupabaseSignUp(page, {
      email: "student.e2e@example.com",
      withSession: true,
    });

    await page.goto("/auth/signup");
    await page.getByRole("textbox", { name: /^email$/i }).fill("student.e2e@example.com");
    await passwordField(page).fill("SafePass123!");
    await confirmPasswordField(page).fill("SafePass123!");
    const ageCheckbox = page.getByRole("checkbox", { name: /13 years old or older/i });
    await expect(ageCheckbox).toBeVisible();
    await ageCheckbox.check({ force: true });
    await page.getByRole("button", { name: /^sign up$/i }).click();

    await expect(page.getByRole("heading", { name: /please check your email/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /back to sign in/i })).toBeVisible();
    await expect(page.getByText(/student\.e2e@example\.com/i)).toBeVisible();
  });

  test("tutor signup shows pending-approval messaging without session", async ({ page }) => {
    await mockSupabaseSignUp(page, {
      email: "tutor.e2e@example.com",
      withSession: false,
    });

    await page.goto("/auth/signup");
    await page.getByRole("button", { name: /i want to be a guide|i want to teach/i }).first().click();
    await page.getByRole("textbox", { name: /^email$/i }).fill("tutor.e2e@example.com");
    await passwordField(page).fill("SafePass123!");
    await confirmPasswordField(page).fill("SafePass123!");
    const ageCheckbox = page.getByRole("checkbox", { name: /13 years old or older/i });
    await expect(ageCheckbox).toBeVisible();
    await ageCheckbox.check({ force: true });
    await page.getByRole("button", { name: /^sign up$/i }).click();

    await expect(page.getByRole("heading", { name: /please check your email/i })).toBeVisible();
    await expect(
      page.getByText(/admin may still need to approve your account before you can sign in/i),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /back to sign in/i })).toBeVisible();
  });
});
