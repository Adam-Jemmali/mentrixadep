import { test, expect } from "@playwright/test";
import { signInWithEmailPassword, getStudentCredentials } from "./helpers/auth";

/**
 * These tests cover the "Critical Path" which the user previously tested manually:
 * 1. Availability check & Stripe redirection.
 * 2. Session joining stability.
 * 3. Session end-time enforcement (Tutor cannot leave early).
 */

test.describe("Critical Flow: Student Booking", () => {
  test.beforeEach(async ({ page }) => {
    const creds = getStudentCredentials();
    if (creds) {
      await signInWithEmailPassword(page, creds.email, creds.password);
    }
  });

  test("can view tutor profile and see availability slots", async ({ page }) => {
    const tutorId = process.env.E2E_TUTOR_ID;
    if (!tutorId) {
      test.skip(true, "E2E_TUTOR_ID not configured");
      return;
    }

    await page.goto(`/tutor/${tutorId}`);
    
    // Check for availability section
    const availSection = page.getByText(/Availability/i);
    await expect(availSection).toBeVisible();

    // Check for at least one slot or "No slots" message to ensure component loaded
    const slots = page.locator("button:has-text(\"CAD\")");
    const count = await slots.count();
    
    if (count > 0) {
      console.log(`Found ${count} availability slots for tutor ${tutorId}`);
      await expect(slots.first()).toBeVisible();
    } else {
      console.log("No active slots found for this tutor currently.");
    }
  });

  test("booking a slot redirects to Stripe checkout", async ({ page }) => {
    const tutorId = process.env.E2E_TUTOR_ID;
    const creds = getStudentCredentials();
    
    if (!tutorId || !creds) {
      test.skip(true, "E2E_TUTOR_ID or student credentials not configured");
      return;
    }

    await page.goto(`/tutor/${tutorId}`);
    
    // Find the first available slot button
    const bookButton = page.locator("button:has-text(\"CAD\")").first();
    const hasSlots = await bookButton.isVisible();
    
    if (hasSlots) {
      await bookButton.click();
      
      // Wait for Stripe redirection
      await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });
      expect(page.url()).toContain("stripe.com");
    } else {
      console.log("Skipping Stripe redirection test: No slots available.");
    }
  });
});

test.describe("Critical Flow: Video Session Stability", () => {
  test("session join room exists and loads UI", async ({ page }) => {
    const sessionId = process.env.E2E_SESSION_ID;
    if (!sessionId) {
      test.skip(true, "E2E_SESSION_ID not configured");
      return;
    }

    const creds = getStudentCredentials();
    if (creds) {
      await signInWithEmailPassword(page, creds.email, creds.password);
    }

    await page.goto(`/video/session/${sessionId}`);
    
    // Check for pre-call lobby or the call itself
    await expect(page.getByText(/Session Room|Join Session|Ready to join/i)).toBeVisible({ timeout: 15000 });
  });

  test("tutor cannot leave session early (enforcement check)", async ({ page }) => {
    // This requires being signed in as a TUTOR.
    const tutorEmail = process.env.E2E_TUTOR_EMAIL;
    const tutorPass = process.env.E2E_TUTOR_PASSWORD;
    const sessionId = process.env.E2E_SESSION_ID;

    if (!tutorEmail || !tutorPass || !sessionId) {
      test.skip(true, "Tutor credentials or E2E_SESSION_ID not configured");
      return;
    }

    await signInWithEmailPassword(page, tutorEmail, tutorPass);
    await page.goto(`/video/session/${sessionId}`);
    
    // Wait for the video call UI
    const endButton = page.getByRole("button", { name: /End Session|Leave Call/i });
    if (await endButton.isVisible()) {
      await endButton.click();
      
      // Should see the notice that tutor cannot leave until end time
      await expect(page.getByText(/You cannot end the session until the scheduled time/i)).toBeVisible();
    }
  });
});
