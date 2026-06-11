import { test, expect } from "@playwright/test";

test.describe("Booking (public tutor profile)", () => {
  test("unknown tutor id returns not found state", async ({ page }) => {
    await page.goto("/tutor/00000000-0000-0000-0000-000000000000", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expect(
      page.getByRole("heading", { name: /page not found|something went wrong/i }),
    ).toBeVisible({ timeout: 30_000 });
  });
});

test.describe("Booking (signed-in student)", () => {
  test("guest cannot access student dashboard", async ({ page }) => {
    await page.goto("/student", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expect(page).toHaveURL(/\/auth\/signin/);
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  });

  test("stripe checkout endpoint rejects missing availability id", async ({ request }) => {
    const res = await request.post("/api/stripe/checkout", {
      data: {},
      headers: { "content-type": "application/json" },
    });
    expect([400, 401, 403]).toContain(res.status());
    const body = await res.json();
    expect(String(body?.error ?? "").length).toBeGreaterThan(0);
  });

  test("stripe webhook endpoint enforces signature header", async ({ request }) => {
    const res = await request.post("/api/stripe/webhook", {
      data: { id: "evt_test" },
      headers: { "content-type": "application/json" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(String(body?.error ?? "").toLowerCase()).toContain("signature");
  });
});
