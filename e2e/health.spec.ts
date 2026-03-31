import { test, expect } from "@playwright/test";

test.describe("Health", () => {
  test("API health returns ok", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, service: "mentrixa" });
    expect(typeof body.time).toBe("string");
  });
});
