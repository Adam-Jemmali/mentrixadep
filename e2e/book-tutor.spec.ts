import { test, expect } from "@playwright/test";

/**
 * Public tutor profile must expose booking UI when the tutor exists.
 * Set E2E_TUTOR_ID in CI secrets to a real tutor UUID from your project.
 */
test.describe("Book flow (public tutor page)", () => {
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
