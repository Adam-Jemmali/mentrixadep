# Senior backend engineering — Mentrixa (YC Summer 2026)

This note is written for the **optional coding-agent session** question: it emphasizes **architecture, data flow, and reliability** rather than UI polish. A separate narrative export of a real agent session lives at [`yc-summer-2026-agent-session-export.md`](./yc-summer-2026-agent-session-export.md).

---

## Stack and boundaries

- **Runtime:** Next.js App Router (RSC + client islands).
- **Mutations and privileged logic:** **Server Actions** (`src/app/actions/*`) — the default path for anything that touches auth, billing, AI quotas, or row-level security–sensitive tables.
- **Data plane:** **Supabase** (Postgres + Auth + storage). Server code uses the service role only where strictly necessary; most reads/writes go through patterns consistent with RLS expectations for the product surface.
- **AI plane:** **Google Gemini** behind a **server-only** module (`src/lib/ai.ts`). Client components never hold API keys; they call server actions or route handlers.

The important architectural rule is **strict layering**: UI → server actions / API routes → domain libs (`ai`, security, observability) → external services. That keeps secrets, rate limits, and prompt policy in one place.

---

## End-to-end request flows

### 1. Quest problem solver (generate → submit → variants)

1. Client posts a natural-language problem and metadata (goal, mode).
2. **`submitQuest`** (server action) validates the session user, applies product rules (quotas, abuse checks), then calls **`generateExplanation`** in `ai.ts`.
3. Model output is parsed into a **typed JSON shape** (hints, reasoning, final answer). Failures are classified:
   - **Hard limits** (e.g. daily quota exhausted) → user sees an honest limit message.
   - **Transient model / network / parse issues** → **deterministic fallback**: structured response built without the model so the session never dead-ends on “AI unavailable.”
4. **`submitQuestAnswer`** prefers model-based grading; on outage it falls back to **normalized string matching** with multiple candidate extractions so short correct answers inside longer explanations still pass when appropriate.
5. **`generateQuestVariants`** similarly degrades to canned “more practice” suggestions if variant generation fails — again preserving flow.

This is **graceful degradation by design**: the product treats the model as an accelerator, not a single point of failure for core study loops.

### 2. Practice packs (MCQ, short answer, problem solving)

**`createPracticeQuest`** attempts AI pack generation; on soft failure it serves a **static fallback pack** per pack type and difficulty band. **`submitPracticeWritten`** mirrors the quest path: AI grading first, deterministic grading if the model path errors (excluding true quota violations).

### 3. Skill duels and queue → match

1. Queue UX triggers **`createAiDuelFromQueue`** / activation paths in **`src/app/actions/duel.ts`**.
2. **`resolveDuelQuestionPack`** tries **`generateDuelQuestions`** (JSON contract, retries on timeout where configured).
3. Quota accounting uses **peek-before-call, increment-only-after-success** so users are not charged for failed generations.
4. If generation fails or returns too few valid items, **`buildSkillDuelFallbackPack`** supplies a vetted static pack so matches always start.

### 4. Admin and lifecycle operations

Registration approval/rejection/reinstate flows run in server actions with **`revalidatePath`** so list views stay coherent after mutations. Account deletion uses **framework-correct `redirect`** after destructive work so RSC trees are not left refetching against a deleted user (see the linked session export for the production React error that motivated that pattern).

---

## Cross-cutting backend concerns

| Concern | Implementation idea |
|--------|---------------------|
| **Rate limits** | Sliding windows keyed per user / route class; AI daily caps separate from generic HTTP limits. |
| **Resilience** | Circuit breaker + exponential backoff around vendor calls; JSON generation helpers with retry on timeout where safe. |
| **Safety** | Central **system guard** prepended to model instructions; prompt injection sanitization; PII checks on model output before persistence or display. |
| **Errors** | **`toUserFacingAiError`** and related helpers normalize vendor noise into a small set of user-safe strings; server actions distinguish **quota** vs **outage** vs **validation**. |
| **Observability** | Structured reporting hooks for rate limits and unexpected failures (Sentry-style patterns in-repo). |

---

## Why this maps to “senior backend” judgment

- **Correct failure taxonomy:** not every error should look like “try again” — quotas and policy violations must stay precise.
- **Idempotent-ish UX:** starting a duel or a quest should not require perfect vendor uptime.
- **Framework alignment:** Next server actions + `redirect` semantics, RSC refetch timing, and server/client import boundaries are treated as **first-class** constraints, not afterthoughts.
- **Minimal blast radius:** fallbacks and guards live next to the feature actions that need them, without rewriting unrelated modules.

---

## Attached agent session (proud moment)

Full write-up (waitlist role propagation, account delete + RSC redirect handling, files touched): **[`docs/yc-summer-2026-agent-session-export.md`](./yc-summer-2026-agent-session-export.md)**.

That session is a good example of **tracing a bug across redirects and framework boundaries** and fixing it with a small, reviewable diff — the same discipline applied to the larger reliability work above.

---

_Mentrixa / OTAMS codebase; narrative for YC application use._
