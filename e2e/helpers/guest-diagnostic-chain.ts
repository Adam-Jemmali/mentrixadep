import { expect, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type StepTraceProblemCapture = {
  nodeName?: string;
  stepSequence: Array<{ correct_option_index: number }>;
};

/** Reviewed bank fixture — same shape as guest-step-trace-bank power-rule entry. */
const E2E_GUEST_STEP_TRACE_FIXTURE = {
  itemId: "e2e-guest-step-trace-power-01",
  prompt: "Find $\\frac{d}{dx}(5x^3)$.",
  nodeName: "Power rule",
  skillNodeId: "e2e-power-rule-node",
  examStakes: "The power rule appears on every AP Calculus AB exam.",
  stepSequence: [
    {
      step_number: 1,
      prompt: "Which rule applies to $5x^3$?",
      options: ["Power rule", "Product rule", "Chain rule"],
      correct_option_index: 0,
      misconception_tag_per_wrong_option: {
        "Product rule": "treats monomial as a product of functions",
        "Chain rule": "confuses power with composition",
      },
    },
    {
      step_number: 2,
      prompt: "After applying the power rule, what is the derivative?",
      options: ["$15x^2$", "$5x^2$", "$15x^3$"],
      correct_option_index: 0,
      misconception_tag_per_wrong_option: {
        "$5x^2$": "forgets to multiply by the coefficient",
        "$15x^3$": "forgets to reduce the exponent",
      },
    },
  ],
} as const;

type PracticePackQuestion = {
  correctIndex: number;
  skillNodeId?: string;
};

export function isGuestDiagnosticChainConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !serviceKey || !anon) return false;
  if (serviceKey.includes("placeholder") || serviceKey === "ci-supabase-service-role-placeholder") {
    return false;
  }
  return true;
}

export function createE2EAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function uniqueChainEmail(): string {
  return `e2e.chain.${Date.now()}@example.com`;
}

export function uniqueChainPassword(): string {
  return `E2eChain!${Date.now().toString(36)}`;
}

export async function findUserIdByEmail(email: string): Promise<string | null> {
  const admin = createE2EAdminClient();
  const normalized = email.trim().toLowerCase();
  let page = 1;
  const perPage = 200;

  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    const hit = data.users.find((u) => (u.email ?? "").trim().toLowerCase() === normalized);
    if (hit?.id) return hit.id;
    if (data.users.length < perPage) break;
    page += 1;
  }
  return null;
}

export async function getRankCardUsername(userId: string): Promise<string | null> {
  const admin = createE2EAdminClient();
  const { data } = await admin
    .from("user_settings")
    .select("rank_card_username")
    .eq("user_id", userId)
    .maybeSingle();
  const username = data?.rank_card_username;
  return typeof username === "string" && username.trim() ? username.trim().toLowerCase() : null;
}

function slugifyRankCardUsername(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

function isValidRankCardUsername(username: string): boolean {
  const re = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$|^[a-z0-9]{3}$/;
  return re.test(username) && username.length >= 3 && username.length <= 30;
}

function suggestRankCardUsername(displayName: string, suffix = ""): string {
  const base = slugifyRankCardUsername(displayName) || "mentrixer";
  const candidate = suffix ? `${base}-${suffix}` : base;
  return candidate.slice(0, 30);
}

/** Fallback when owner profile load has not yet provisioned a public rank slug. */
export async function provisionRankUsernameForE2E(userId: string, _email: string): Promise<string> {
  const existing = await getRankCardUsername(userId);
  if (existing) return existing;

  const admin = createE2EAdminClient();

  await admin
    .from("users")
    .update({ approved: true, status: "approved", role: "student" })
    .eq("id", userId);

  const displaySeed = `mentrixer-${userId.replace(/-/g, "").slice(0, 10)}`;
  const base = suggestRankCardUsername(displaySeed);
  const candidates = [
    base,
    ...Array.from({ length: 8 }, (_, i) => suggestRankCardUsername(displaySeed, String(i + 2))),
  ];

  let lastError = "unknown";
  for (const candidate of candidates) {
    if (!isValidRankCardUsername(candidate)) continue;
    const { data: taken } = await admin
      .from("user_settings")
      .select("user_id")
      .ilike("rank_card_username", candidate)
      .maybeSingle();
    if (taken?.user_id && taken.user_id !== userId) continue;

    const { error } = await admin.from("user_settings").upsert(
      {
        user_id: userId,
        rank_card_username: candidate,
        rank_card_public: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (!error) return candidate;
    lastError = error.message;
  }

  throw new Error(`Could not provision rank_card_username for E2E user: ${lastError}`);
}

export async function assertVerifiedFirstAttemptsOnePerNode(userId: string): Promise<void> {
  const admin = createE2EAdminClient();
  const deadline = Date.now() + 30_000;

  let answeredNodeIds: string[] = [];
  while (Date.now() < deadline) {
    const { data: questRow } = await admin
      .from("quests")
      .select("metadata")
      .eq("creator_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const meta = questRow?.metadata as {
      questions?: Array<{ skillNodeId?: string }>;
      session?: { answers?: Array<{ index: number }> };
    } | null;

    const answeredIndices = new Set((meta?.session?.answers ?? []).map((a) => a.index));
    answeredNodeIds = [
      ...new Set(
        (meta?.questions ?? [])
          .map((q, index) => (answeredIndices.has(index) ? q.skillNodeId : null))
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    if (answeredNodeIds.length >= 4 && answeredIndices.size >= 4) break;
    await sleep(500);
  }

  expect(answeredNodeIds.length).toBeGreaterThan(0);

  const { data, error } = await admin
    .from("verified_first_attempts")
    .select("skill_node_id")
    .eq("user_id", userId)
    .in("skill_node_id", answeredNodeIds);

  expect(error).toBeNull();
  const nodeIds = (data ?? []).map((row) => row.skill_node_id).filter(Boolean);
  expect(nodeIds.length).toBe(answeredNodeIds.length);

  const unique = new Set(nodeIds);
  expect(unique.size).toBe(nodeIds.length);
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForOnboardingPackQuestions(
  userId: string,
  timeoutMs = 60_000,
): Promise<PracticePackQuestion[]> {
  const admin = createE2EAdminClient();
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const { data } = await admin
      .from("quests")
      .select("metadata")
      .eq("creator_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const meta = data?.metadata as {
      questions?: PracticePackQuestion[];
      session?: { startedAt?: string };
    } | null;
    const questions = meta?.questions;
    if (
      Array.isArray(questions) &&
      questions.length === 5 &&
      typeof meta?.session?.startedAt === "string"
    ) {
      return questions;
    }
    await sleep(750);
  }

  throw new Error("Timed out waiting for onboarding practice pack session (5 questions).");
}

export async function dismissStudentOnboardingTour(page: Page): Promise<void> {
  const skip = page.getByRole("button", { name: /^skip$/i });
  if (await skip.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await skip.click();
  }
}

export async function completeStudentSignupActivate(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  if (/\/auth\/signup/.test(page.url())) {
    await page.getByRole("textbox", { name: /^email$/i }).fill(email);
    const ageCheckbox = page.getByRole("checkbox", { name: /13 years old or older/i });
    await expect(ageCheckbox).toBeVisible();
    await ageCheckbox.check({ force: true });
  }

  const base = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
  const joinRes = await page.request.post(`${base}/api/waitlist/join`, {
    data: { email, role: "student" },
    headers: { "Content-Type": "application/json" },
  });
  expect(joinRes.ok()).toBeTruthy();

  const admin = createE2EAdminClient();
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: "student",
      age_confirmed_13_or_older: true,
    },
  });

  if (created.error) {
    const msg = created.error.message.toLowerCase();
    const duplicate =
      msg.includes("already") || msg.includes("exists") || msg.includes("registered");
    if (!duplicate) {
      throw new Error(`E2E student provision failed: ${created.error.message}`);
    }
    const existingId = await findUserIdByEmail(email);
    if (!existingId) {
      throw new Error(`E2E student exists in auth but could not resolve user id for ${email}`);
    }
    await admin.auth.admin.updateUserById(existingId, {
      password,
      email_confirm: true,
      user_metadata: {
        role: "student",
        age_confirmed_13_or_older: true,
      },
    });
  }

  const userId = created.data.user?.id ?? (await findUserIdByEmail(email));
  if (!userId) {
    throw new Error("E2E student provision succeeded without a resolvable user id.");
  }

  await admin.from("users").upsert(
    {
      id: userId,
      role: "student",
      approved: true,
    },
    { onConflict: "id" },
  );

  await page.goto(`/auth/signin?signin=1&email=${encodeURIComponent(email)}`);
  await page.getByLabel(/^email$/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL(/\/student/, { timeout: 90_000 });
}

export async function solveGuestStepTraceDiagnostic(page: Page): Promise<StepTraceProblemCapture> {
  const problem: StepTraceProblemCapture = {
    nodeName: E2E_GUEST_STEP_TRACE_FIXTURE.nodeName,
    stepSequence: E2E_GUEST_STEP_TRACE_FIXTURE.stepSequence.map((step) => ({
      correct_option_index: step.correct_option_index,
    })),
  };

  await page.route("**/api/guest-diagnostic/start**", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    let body: { resume?: boolean } = {};
    try {
      body = (route.request().postDataJSON() ?? {}) as { resume?: boolean };
    } catch {
      body = {};
    }

    if (body.resume === true) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, resumed: false }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        resumed: false,
        problem: E2E_GUEST_STEP_TRACE_FIXTURE,
        unitNumber: 2,
        unitName: "Differentiation Definition and Properties",
        nodeSlug: "power-rule",
      }),
    });
  });

  await page.goto("/try");
  await expect(page.getByRole("button", { name: /find out what you do not know/i })).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("button", { name: /find out what you do not know/i }).click();

  const blocked = page.getByText(
    /too many demos|daily demo limit|could not load diagnostic|wait about \d+ minute/i,
  );
  if (await blocked.isVisible({ timeout: 3_000 }).catch(() => false)) {
    const msg = (await blocked.first().textContent())?.trim() ?? "guest diagnostic blocked";
    throw new Error(`${msg} — E2E should stub /api/guest-diagnostic/start; check route registration.`);
  }

  await expect(page.getByText(/step\s+1\s+of/i)).toBeVisible({ timeout: 45_000 });
  for (let i = 0; i < problem.stepSequence.length; i++) {
    const correctIdx = problem.stepSequence[i]?.correct_option_index ?? 0;
    const optionButtons = page.locator(".mt-6.grid.gap-3 button[type='button']");
    await expect(optionButtons.nth(correctIdx)).toBeVisible({ timeout: 15_000 });
    await optionButtons.nth(correctIdx).click();

    const continueBtn = page.getByRole("button", { name: /continue trace|see verdict/i });
    if (await continueBtn.isVisible({ timeout: 2_500 }).catch(() => false)) {
      await continueBtn.click();
    }
  }

  return problem;
}

async function advanceAfterMcqAnswer(page: Page, isLastQuestion: boolean): Promise<void> {
  if (isLastQuestion) return;

  const dialogNext = page
    .getByRole("dialog")
    .getByRole("button", { name: /^next question$/i });
  const wrongNext = page
    .locator('[role="alert"], [class*="alert"]')
    .getByRole("button", { name: /^next question$/i });

  if (await dialogNext.isVisible({ timeout: 20_000 }).catch(() => false)) {
    await dialogNext.click();
    return;
  }

  if (await wrongNext.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await wrongNext.click();
    return;
  }

  await page.getByRole("button", { name: /^next question$/i }).first().click({ timeout: 10_000 });
}

export async function ensureOnboardingQuestWizard(page: Page): Promise<void> {
  if (!/\/student\/quest/.test(page.url())) {
    await page.goto("/student/quest?onboarding=true");
  }
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle").catch(() => {});
  await expect(page.getByRole("button", { name: /start your first quest/i })).toBeVisible({
    timeout: 60_000,
  });
}

export async function completeOnboardingPracticePack(
  page: Page,
  userId: string,
): Promise<void> {
  await ensureOnboardingQuestWizard(page);

  const startBtn = page.getByRole("button", { name: /start your first quest/i });
  await expect(startBtn).toBeEnabled({ timeout: 30_000 });

  const packDbReady = waitForOnboardingPackQuestions(userId, 120_000);
  await startBtn.click();

  const errLine = page.locator("p.text-sm.font-medium.text-red-600");
  await Promise.race([
    page.getByText(/Q1\/5/).waitFor({ state: "visible", timeout: 120_000 }),
    errLine.waitFor({ state: "visible", timeout: 120_000 }).then(async () => {
      throw new Error(
        `Onboarding pack failed to start: ${(await errLine.first().textContent())?.trim() ?? "unknown error"}`,
      );
    }),
  ]);

  const questions = await packDbReady;

  for (let q = 0; q < questions.length; q++) {
    if (q > 0) {
      await expect(page.getByText(new RegExp(`Q${q + 1}/5`))).toBeVisible({ timeout: 60_000 });
    }

    const correctIdx = questions[q]?.correctIndex ?? 0;
    const options = page.locator(".grid.gap-2.sm\\:grid-cols-2 button[type='button']");
    await expect(options.nth(correctIdx)).toBeVisible({ timeout: 30_000 });
    await options.nth(correctIdx).click();

    await advanceAfterMcqAnswer(page, q >= questions.length - 1);
  }

  await page.waitForURL(/\/student/, { timeout: 120_000 });
}

export async function expectRankPassportVerdictPanel(page: Page): Promise<void> {
  await expect(page.getByText(/rank movement/i)).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText(/^accuracy$/i).first()).toBeVisible();

  const srOnly = page.locator(".sr-only").filter({ hasText: /accuracy|first-answer|verified/i });
  await expect(srOnly.first()).toBeVisible();
  const summary = (await srOnly.first().textContent())?.trim() ?? "";
  expect(summary.length).toBeGreaterThan(12);

  await expect(page.getByRole("link", { name: /verify/i }).first()).toBeVisible();
}
