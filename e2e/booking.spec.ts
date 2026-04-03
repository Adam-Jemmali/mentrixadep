import { test, expect } from "@playwright/test";
import { getStudentCredentials, signInWithEmailPassword } from "./helpers/auth";

test.describe("Booking (public tutor profile)", () => {
  test("shows booking affordances when E2E_TUTOR_ID is set", async ({ page }) => {
    const tutorId = process.env.E2E_TUTOR_ID?.trim();
    test.skip(!tutorId, "Set E2E_TUTOR_ID (real tutor UUID) to run this smoke test.");

    await page.goto(`/tutor/${tutorId!}`);
    await expect(page.getByRole("heading", { name: /book a session/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("columnheader", { name: /^book$/i })).toBeVisible();
  });
});

test.describe("Booking (signed-in student)", () => {
  test("after login, student dashboard lists sessions area", async ({ page }) => {
    const creds = getStudentCredentials();
    test.skip(!creds, "Set E2E_STUDENT_EMAIL and E2E_STUDENT_PASSWORD for this flow.");

    await signInWithEmailPassword(page, creds!.email, creds!.password);

    await page.goto("/student");
    await expect(
      page.getByText(/Sessions, divisions, and practice quests in one place/i)
    ).toBeVisible({ timeout: 25_000 });
  });

  test("Stripe checkout: full pay → webhook → session row (manual / CI with Stripe test mode)", async () => {
    test.skip(true, "Automate with Stripe test clock + webhook fixture, or run manually in staging.");
  });

  test("tutor notification on booking: assert via DB or Resend in integration suite", async () => {
    test.skip(true, "Use Supabase service role or integration test to assert notifications.");
  });
});
