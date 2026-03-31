import { test, expect } from "@playwright/test";

test.describe("Protected student routes (guest)", () => {
  test("redirects /student/quest to sign-in", async ({ page }) => {
    await page.goto("/student/quest");
    await expect(page).toHaveURL(/\/auth\/signin/);
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  });

  test("redirects /student/division to sign-in", async ({ page }) => {
    await page.goto("/student/division");
    await expect(page).toHaveURL(/\/auth\/signin/);
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  });
});
