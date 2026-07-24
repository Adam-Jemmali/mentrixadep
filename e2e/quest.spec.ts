import { test, expect } from "@playwright/test";

test.setTimeout(120_000);

test.describe("Quest routes (guest)", () => {
  test("redirects unauthenticated user to sign-in", async ({ page }) => {
    await page.goto("/student/quest", { waitUntil: "domcontentloaded", timeout: 90_000 });
    await expect(page).toHaveURL(/\/auth\/signin/, { timeout: 60_000 });
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  });
});

test.describe("Quest guest keyboard", () => {
  test("try route exposes keyboard-focusable controls", async ({ page }) => {
    await page.goto("/try", { waitUntil: "domcontentloaded", timeout: 90_000 });
    const control = page.locator("main").getByRole("button").first();
    await expect(control).toBeVisible({ timeout: 60_000 });
    await control.focus();
    await expect(control).toBeFocused();
  });
});

test.describe("Quest auth UX", () => {
  test("redirected sign-in page remains usable from quest deep link", async ({ page }) => {
    await page.goto("/student/quest", { waitUntil: "domcontentloaded", timeout: 90_000 });
    await expect(page).toHaveURL(/\/auth\/signin/);
    await expect(page.getByRole("textbox", { name: /^email$/i })).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /^sign in$/i })).toBeVisible();
  });

  test("quest deep link does not crash for guest navigation", async ({ page }) => {
    await page.goto("/student/quest", { waitUntil: "domcontentloaded", timeout: 90_000 });
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await expect(page.getByText(/something went wrong|next_not_found/i)).toHaveCount(0);
  });
});
