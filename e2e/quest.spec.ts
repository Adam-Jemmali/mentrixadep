import { test, expect } from "@playwright/test";
import { getStudentCredentials, signInWithEmailPassword } from "./helpers/auth";

test.describe("Quest routes (guest)", () => {
  test("redirects unauthenticated user to sign-in", async ({ page }) => {
    await page.goto("/student/quest");
    await expect(page).toHaveURL(/\/auth\/signin/);
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  });
});

test.describe("Quest (signed-in)", () => {
  test("quest workspace is reachable for student", async ({ page }) => {
    const creds = getStudentCredentials();
    test.skip(!creds, "Set E2E_STUDENT_EMAIL and E2E_STUDENT_PASSWORD.");

    await signInWithEmailPassword(page, creds!.email, creds!.password);
    await page.goto("/student/quest");
    await expect(page).toHaveURL(/\/student\/quest/);
    await expect(page.getByText(/quest|practice|new quest/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("XP and history: verify via unit/integration tests; E2E needs completed quest seed", async () => {
    test.skip(true, "Seed a completed quest or assert user_xp in integration tests.");
  });
});
