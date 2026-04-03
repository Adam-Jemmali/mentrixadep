import type { Page } from "@playwright/test";

/** Email/password sign-in (Supabase). Requires approved user for /student. */
export async function signInWithEmailPassword(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto("/auth/signin");
  await page.getByLabel(/^email$/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL(
    /\/student|\/tutor|\/admin|\/dashboard|\/pending-approval|\/auth\/select-role/,
    { timeout: 45_000 }
  );
}

export function hasE2ECredentials(): boolean {
  return Boolean(
    process.env.E2E_STUDENT_EMAIL?.trim() && process.env.E2E_STUDENT_PASSWORD?.trim()
  );
}

export function getStudentCredentials(): { email: string; password: string } | null {
  const email = process.env.E2E_STUDENT_EMAIL?.trim();
  const password = process.env.E2E_STUDENT_PASSWORD?.trim();
  if (!email || !password) return null;
  return { email, password };
}
