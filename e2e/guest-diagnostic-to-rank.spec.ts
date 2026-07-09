import { test, expect } from "@playwright/test";
import {
  assertVerifiedFirstAttemptsOnePerNode,
  completeOnboardingPracticePack,
  completeStudentSignupActivate,
  dismissStudentOnboardingTour,
  expectRankPassportVerdictPanel,
  findUserIdByEmail,
  getRankCardUsername,
  provisionRankUsernameForE2E,
  isGuestDiagnosticChainConfigured,
  ensureOnboardingQuestWizard,
  solveGuestStepTraceDiagnostic,
  uniqueChainEmail,
  uniqueChainPassword,
} from "./helpers/guest-diagnostic-chain";

test.describe.configure({ mode: "serial" });
test.setTimeout(360_000);

test.describe("Guest diagnostic → signup → first quest → rank passport", () => {
  test.skip(
    !isGuestDiagnosticChainConfigured(),
    "Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and a real SUPABASE_SERVICE_ROLE_KEY.",
  );

  test("full product identity chain from /try through verified rank card", async ({ page }) => {
    const email = uniqueChainEmail();
    const password = uniqueChainPassword();

    const problem = await solveGuestStepTraceDiagnostic(page);
    const nodeName = problem.nodeName?.trim();
    expect(nodeName).toBeTruthy();

    await expect(page.getByText(/step trace verdict/i)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(new RegExp(nodeName!, "i")).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /you do not know|you solved this/i })).toBeVisible();
    await expect(page.getByText(/^\d+%$/)).toHaveCount(0);

    const saveCta = page.getByRole("link", { name: /save this and start fixing it/i });
    await expect(saveCta).toBeVisible();
    await saveCta.click();
    await expect(page).toHaveURL(/\/auth\/signup/, { timeout: 30_000 });

    await completeStudentSignupActivate(page, email, password);
    await dismissStudentOnboardingTour(page);

    await ensureOnboardingQuestWizard(page);
    await expect(page.getByText(/AP Calculus AB/i).first()).toBeVisible();
    await expect(page.getByText(/five first answers from the AP Calculus AB item bank/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /choose a subject/i })).toHaveCount(0);

    const userId = await findUserIdByEmail(email);
    expect(userId).toBeTruthy();

    await completeOnboardingPracticePack(page, userId!);
    await assertVerifiedFirstAttemptsOnePerNode(userId!);

    await page.goto(`/student/${userId}`);
    await page.waitForLoadState("domcontentloaded");

    let username = await getRankCardUsername(userId!);
    if (!username) {
      username = await provisionRankUsernameForE2E(userId!, email);
    }
    expect(username).toBeTruthy();

    const rankResponse = await page.goto(`/rank/${username}`);
    expect(rankResponse?.status() ?? 500).toBeLessThan(500);
    await expect(page.getByText(/verified rank passport/i)).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText(/peer standing|first-attempt accuracy/i).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByLabel(/AP Calculus AB mastery grid/i)).toBeVisible({ timeout: 45_000 });

    await expectRankPassportVerdictPanel(page);
  });
});
