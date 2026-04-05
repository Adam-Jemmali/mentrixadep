import { test, expect } from "@playwright/test";

test.describe("Quest routes (guest)", () => {
  test("redirects unauthenticated user to sign-in", async ({ page }) => {
    await page.goto("/student/quest");
    await expect(page).toHaveURL(/\/auth\/signin/);
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  });
});

test.describe("Quest auth UX", () => {
  test("redirected sign-in page remains usable from quest deep link", async ({ page }) => {
    await page.goto("/student/quest");
    await expect(page).toHaveURL(/\/auth\/signin/);
    await expect(page.getByRole("textbox", { name: /^email$/i })).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /^sign in$/i })).toBeVisible();
  });

  test("quest deep link does not crash for guest navigation", async ({ page }) => {
    await page.goto("/student/quest");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await expect(page.getByText(/something went wrong|next_not_found/i)).toHaveCount(0);
  });
});
