# Lean Vertical Slice Architecture Plan — Mentrixa

**Author:** Principal Software Architect review  
**Date:** 2026-06-09  
**Status:** **Complete** (2026-06-09). All phases implemented: `shared/` + `features/` vertical slices, thin API shells, admin/clan god-file splits, unit tests colocated. Build + 62 unit tests green.

This plan refactors the Mentrixa monolith from a **layer-first** Next.js layout into a **feature-first** vertical slice layout, with a strict anti-bloat rule: **colocate code that changes together into the same file**. We do not introduce controller/service/repository/DTO file trees.

---

## Executive Summary

| Metric | Today | Target |
|--------|-------|--------|
| Architectural style | Layered monolith (routes → actions → lib → components) | Vertical slices with thin framework shells |
| Server action files | 35 flat files in `src/app/actions/` (largest: 1,824 LOC) | ~45 capability files in `src/features/` |
| Shared lib files | 129 scattered in `src/lib/` | ~30 files in `src/shared/` |
| UI components | 196 in `src/components/` (mixed domain + design system) | ~35 in `src/shared/ui/`, rest colocated per feature |
| API routes | 40 handlers with embedded logic | 40 thin re-export shells (≤15 LOC each) |

**Core rule:** A feature file owns its schemas, types, helpers, and exported entrypoints. Split only when a file exceeds **~300 lines** or a sub-component is reused by **2+ features**.

---

## 1. Current State (What We Are Fixing)

### 1.1 Architectural Style

**Layered / Horizontal Monolith** inside Next.js App Router:

```
Pages (app/)  →  Server Actions (app/actions/)  →  Lib (lib/)  →  Supabase
     ↓                    ↓                           ↓
Components (components/) — imported from everywhere
```

Business logic is split by **technical role** (actions vs lib vs components), not by **user journey**. Route folders (`student/`, `tutor/`) hint at domains, but the real logic lives in shared god-files:

| File | Lines | Problem |
|------|-------|---------|
| `src/app/actions/tutor.ts` | 1,824 | Availability + sessions + requests + courses + admin views |
| `src/app/actions/duel.ts` | 1,741 | Queue, matchmaking, gameplay, history in one file |
| `src/app/actions/autoPilot.ts` | 1,366 | Studio AI, transcription jobs, package CRUD |
| `src/app/actions/student.ts` | 1,334 | Hub, booking, availability browse, ratings, courses |
| `src/app/actions/quest.ts` | 1,224 | Quest AI + divisions catalog + leaderboards + XP reads |
| `src/lib/security.ts` | 669 | Validation, rate limits, CSRF — used by every feature |
| `src/proxy.ts` | 643 | Auth gate for entire app |

There is **no Clean/Hexagonal boundary**. `lib/` mixes infrastructure (`supabase/`, `redis.ts`) with domain logic (`duel-reward.ts`, `booking-pricing.ts`). `lib/jobs/handlers/` imports **up** into `app/actions/` — inverted dependency.

### 1.2 Technical Layers Today

| Layer | Location | Count | Role |
|-------|----------|-------|------|
| App routes & pages | `src/app/` | ~235 | Routing, RSC pages, layouts |
| Server actions | `src/app/actions/` | 35 | Primary business logic |
| API routes | `src/app/api/` | 40 | Webhooks, crons, public endpoints |
| Shared library | `src/lib/` | 129 | DB, auth, AI, email, Stripe, domain helpers |
| UI components | `src/components/` | 196 | Feature UI + design system mixed |
| Middleware | `src/proxy.ts` | 1 | Session, rate limits, redirects |
| DB schema | `supabase/*.sql` | 93 | Stays centralized (not per-slice) |
| Tests | `tests/unit/`, `e2e/` | 22 | Colocate with features over time |

---

## 2. Target Structure

```
src/
├── features/                    # Vertical slices — the product
│   ├── auth/
│   ├── registration/
│   ├── settings/
│   ├── admin/
│   ├── booking/
│   ├── payments/
│   ├── tutor/
│   ├── video/
│   ├── studio-ai/
│   ├── quest/
│   ├── divisions/
│   ├── xp/
│   ├── duels/
│   ├── clans/
│   ├── resolve/
│   ├── learning-path/
│   ├── student-profile/
│   ├── referrals/
│   ├── institutions/
│   ├── marketing/
│   ├── notifications/
│   ├── jobs/
│   └── analytics/
│
├── shared/                      # Cross-feature only (DRY, not AHA)
│   ├── core/                    # auth, db, env, security, errors
│   ├── integrations/            # stripe, email, ai, redis, observability
│   ├── ui/                      # design system primitives
│   └── types/                   # database.types.ts, global augmentations
│
├── app/                         # Next.js shells ONLY (thin)
│   ├── (app)/, (marketing)/, auth/, api/
│   └── actions/                 # DELETE after migration (re-export shim period)
│
├── proxy.ts                     # → shared/core/proxy.ts (logic), root re-export
└── hooks/                       # → shared/core/hooks/ or feature-local
```

### 2.1 File Anatomy (Mandatory Order)

Every consolidated feature file follows this top-to-bottom structure:

```typescript
"use server"; // or route export — only on entry files that need it

// 1. Imports & Constants
import { z } from "zod";
import { requireRole } from "@/shared/core/auth";
const RATE_LIMIT = { max: 10, windowSec: 60 };

// 2. Types / Interfaces / Schemas
const inputSchema = z.object({ ... });
export type BookSessionResult = { sessionId: string };

// 3. Internal Helper Functions (not exported)
function enrichWithTutorProfile(...) { ... }

// 4. Main Feature Handler / Entrypoint (Exported)
export async function bookSession(...) { ... }
```

### 2.2 Next.js Constraint (Pragmatic Compromise)

Next.js **requires** `app/**/page.tsx` and `app/api/**/route.ts` at specific paths. We do **not** fight the framework:

- **Route files become thin shells** (import + re-export, typically 5–15 lines).
- **All logic lives in `src/features/`**.

Example after migration:

```typescript
// src/app/api/stripe/webhook/route.ts  (shell, ~8 lines)
export { POST } from "@/features/payments/stripe-webhook";
```

```typescript
// src/features/payments/stripe-webhook.ts  (full logic, ~250 lines)
// imports, schemas, helpers, POST handler — all in one file
```

---

## 3. Shared Infrastructure (`src/shared/`)

Only code referenced by **2+ features** belongs here. Feature-unique logic stays in the feature file even if it looks "utility-like."

### 3.1 `shared/core/` — Platform primitives

| Target file | Merged from (current) | Notes |
|-------------|----------------------|-------|
| `auth.ts` | `lib/auth.ts`, `lib/role-home.ts`, `lib/user-access-status.ts`, `lib/post-auth-destination.ts`, `lib/post-approval-redirect.ts` | `post-approval-redirect` calls diagnostic feature via import, not inline logic |
| `env.ts` | `lib/env.ts` | Zod env validation |
| `security.ts` | `lib/security.ts`, `lib/security/captcha.ts`, `lib/security/auth-abuse.ts` | 669 LOC — stays one file; splitting by layer forbidden |
| `errors.ts` | `lib/user-facing-error.ts`, `lib/is-next-redirect-error.ts` | |
| `proxy.ts` | `src/proxy.ts` | Root `proxy.ts` re-exports |
| `cache.ts` | `lib/cache.ts`, `lib/redis.ts`, `lib/user-meta-cache.ts` | |
| `serialize.ts` | `lib/rsc-serialize.ts` | |
| `utils.ts` | `lib/utils.ts`, `lib/time-format.ts`, `lib/timezones.ts` | |
| `flags.ts` | `lib/flags.ts` | |
| `zero-trust.ts` | `lib/zero-trust.ts` | |
| `cron-auth.ts` | `lib/cron.ts` | Cron bearer verification |
| `hooks/use-realtime-router-refresh.ts` | `hooks/use-realtime-router-refresh.ts` | |

### 3.2 `shared/integrations/` — External services

| Target file | Merged from |
|-------------|-------------|
| `supabase/client.ts` | `lib/supabase/client.ts` |
| `supabase/server.ts` | `lib/supabase/server.ts` |
| `supabase/admin.ts` | `lib/supabase/admin.ts` |
| `stripe/server.ts` | `lib/stripe-server.ts`, `lib/stripe-connect-errors.ts` |
| `stripe/booking.ts` | `lib/stripe-session-booking.ts`, `lib/stripe-booking-sync.ts`, `lib/stripe-checkout-copy.ts` |
| `email/index.ts` | `lib/email.ts`, `lib/email/index.ts`, `lib/email/shared.ts`, `lib/email/templates.ts`, `lib/email/session.ts`, `lib/email/marketing.ts`, `lib/email-identity.ts` |
| `ai/index.ts` | `lib/ai.ts`, `lib/ai/index.ts`, `lib/ai/shared.ts` |
| `ai/quest.ts` | `lib/ai/quest.ts` |
| `ai/duel.ts` | `lib/ai/duel.ts` |
| `ai/resolve.ts` | `lib/ai/resolve.ts`, `lib/resolve-ai.ts` |
| `ai/brief.ts` | `lib/ai/brief.ts` |
| `ai/practice.ts` | `lib/ai/practice.ts` |
| `ai/studio.ts` | `lib/ai/studio.ts` |
| `observability.ts` | `lib/observability.ts`, `lib/performance.ts`, `lib/ui-performance.ts` |
| `analytics.ts` | `lib/analytics.ts`, `lib/use-track.ts` |
| `recordings/vendor.ts` | `lib/vendor/fix-webm-duration.js` |

### 3.3 `shared/types/`

| Target file | Merged from |
|-------------|-------------|
| `database.ts` | `lib/database.types.ts` | Generated; single source of truth |
| `google-gsi.d.ts` | `types/google-gsi.d.ts` | |

### 3.4 `shared/ui/` — Design system only

Move **only** primitives with no business meaning:

`src/components/ui/*` → `src/shared/ui/` (avatar, button, card, dialog, input, label, select, sheet, switch, tabs, badge, textarea, etc.)

Also: `error-boundary.tsx`, `loading.tsx`, `empty-state.tsx`, `navigation-progress.tsx`, brand shells (`mentrixa-logo.tsx`, `mentrixa-wordmark.tsx`, `mentrixa-loading-mark.tsx`).

**Stay out of shared/ui:** anything mentioning tutor, student, duel, clan, quest, booking, etc.

---

## 4. Feature Slices — Consolidation Map

Below, each row is a **target file**. "Merged from" lists every current file whose logic moves into that single file. Page/route shells are listed separately — they become thin importers.

---

### 4.1 `features/auth/` — Authentication & session (6 files)

| Target file | ~LOC | Merged from |
|-------------|------|-------------|
| `sign-in.ts` | 180 | `actions/auth.ts` (signIn, signOut), `api/auth/signin/route.ts`, `components/auth/google-sign-in-button.tsx`, `components/auth/google-gsi-script.tsx`, `lib/oauth-auth.ts`, `lib/google-gsi-loader.ts`, `lib/google-id-token.ts` |
| `sign-up.ts` | 200 | `actions/auth.ts` (signUp, setUserRole), `api/auth/signup/route.ts`, `components/auth/signup-form-client.tsx` |
| `password-reset.ts` | 120 | `actions/auth.ts` (reset flows), `api/auth/request-password-reset/route.ts`, pages under `app/auth/forgot-password`, `confirm-reset`, `reset-password` |
| `oauth-callback.ts` | 150 | `actions/auth.ts` (OAuth redirects), `api/auth/oauth-next/route.ts`, `app/auth/callback/route.ts`, `app/auth/session-sync/route.ts` |
| `select-role.ts` | 80 | `actions/auth.ts` (setUserRole), `app/auth/select-role/page.tsx` |
| `access-gate.ts` | 100 | `app/(app)/pending-approval/page.tsx`, `components/auth/PendingApprovalContent.tsx`, `components/auth/PendingApprovalRealtimeRefresh.tsx`, `components/auth/access-request-submitted.tsx`, `app/(app)/suspended/page.tsx` |

**UI colocated in folder (only if reused within auth):**

| File | Merged from |
|------|-------------|
| `AuthLayout.tsx` | `components/auth/AuthLayout.tsx`, `components/auth/AuthCard.tsx`, `app/auth/auth-layout-shell.tsx`, `app/auth/layout.tsx` |
| `activate.tsx` | `components/auth/activate-auth-client.tsx`, `app/auth/activate/page.tsx` |

**Thin shells:** `app/auth/signin/page.tsx`, `app/auth/signup/page.tsx` → import from feature files.

---

### 4.2 `features/registration/` — Waitlist & admin approval (4 files)

| Target file | ~LOC | Merged from |
|-------------|------|-------------|
| `waitlist.ts` | 200 | `api/waitlist/join/route.ts`, `api/waitlist/status/route.ts`, `components/waitlist-join-form.tsx`, `lib/waitlist-role.ts`, `lib/waitlist-user-sync.ts`, `lib/registration-request-lookup.ts`, `lib/registration-request-join.ts`, `lib/delete-registration-requests-by-email.ts`, `lib/disposable-email.ts`, `lib/onboarding-request-client.ts` |
| `approve-registration.ts` | 250 | `actions/admin.ts` (approve/reject registration), `actions/auth.ts` (registration linkage), `app/(app)/admin/registration-actions.tsx` |
| `registration-queue.ts` | 200 | `actions/admin.ts` (getRegistrationRequests, getAutoApproveRegistrations), `app/(app)/admin/registrations/registrations-client.tsx` |
| `compliance.ts` | 90 | `actions/compliance.ts` (entire file) |

---

### 4.3 `features/settings/` — Account settings (2 files)

| Target file | ~LOC | Merged from |
|-------------|------|-------------|
| `user-settings.ts` | 175 | `actions/settings.ts` (entire file) |
| `settings-page.tsx` | 150 | `app/(app)/settings/settings-client.tsx`, `app/(app)/settings/page.tsx`, `components/account-security-panel.tsx` |

---

### 4.4 `features/admin/` — Platform administration (5 files)

| Target file | ~LOC | Merged from |
|-------------|------|-------------|
| `dashboard.ts` | 280 | `actions/admin.ts` (getPlatformMetrics, getAllUsers, system settings reads), `app/(app)/admin/admin-dashboard-client.tsx`, `app/(app)/admin/admin-client.tsx`, `app/(app)/admin/page.tsx` |
| `users.ts` | 200 | `actions/admin.ts` (user list ops), `app/(app)/admin/users/users-client.tsx`, `app/(app)/admin/users/page.tsx` |
| `system-settings.ts` | 150 | `actions/admin.ts` (get/updateSystemSettings), `app/(app)/admin/settings/*`, `app/admin/settings/settings-client.tsx`, `api/admin/config/route.ts` |
| `analytics.ts` | 120 | `app/(app)/admin/analytics/analytics-client.tsx`, `app/(app)/admin/analytics/page.tsx` |
| `reconciliation.ts` | 90 | `actions/reconciliation.ts`, `app/(app)/admin/reconciliation/*` |

**Layout shell:** `app/(app)/admin/layout.tsx`, `admin-sidebar.tsx` — thin, imports nav from `dashboard.ts` exports.

---

### 4.5 `features/verification/` — Tutor course verification (2 files)

| Target file | ~LOC | Merged from |
|-------------|------|-------------|
| `verification-queue.ts` | 280 | `actions/verification.ts`, `actions/auth.ts` (createVerificationForUser import becomes internal call to this feature) |
| `verification-ui.tsx` | 200 | `app/(app)/admin/verification/verification-client.tsx`, `app/(app)/admin/verification/page.tsx` |

**Cron shell:** `api/cron/verification-overdue/route.ts` → re-export from `verification-queue.ts`.

---

### 4.6 `features/booking/` — Session booking & availability (6 files)

Split `actions/student.ts` (1,334 LOC) and `actions/cancellation.ts` by **user journey**, not layer.

| Target file | ~LOC | Merged from |
|-------------|------|-------------|
| `browse-availability.ts` | 280 | `actions/student.ts` (getTutorAvailability, getTutorAvailabilityKeysetPage, getAvailableCourses, getTutorExpertiseMap), `app/(app)/student/availability-browser.tsx`, `lib/booking-pricing.ts`, `lib/availability-schemas.ts`, `lib/availability-slot-builder.ts` |
| `book-session.ts` | 300 | `actions/student.ts` (bookSession, bookSessionAsUser), `api/stripe/checkout/route.ts`, `api/stripe/checkout/success/route.ts`, `api/stripe/checkout/cancel-return/route.ts`, `app/(app)/student/book-session-button.tsx`, `components/book-session-button-public.tsx`, `components/booking-price-breakdown.tsx`, `components/ui/booking-confirmation-card.tsx` |
| `cancel-session.ts` | 280 | `actions/student.ts` (cancelSession), `actions/cancellation.ts`, `actions/sessions.ts`, `app/(app)/student/cancel-session-button.tsx`, `components/delete-past-session-button.tsx`, `lib/refund-eligibility.ts` |
| `confirmed-booking.tsx` | 120 | `app/(app)/student/booking/confirmed/page.tsx`, `add-to-calendar-button.tsx`, `lib/calendar-ics.ts` |
| `session-lists.ts` | 280 | `actions/student.ts` (getUpcomingSessions, getPastSessions, getSessionRequests), `actions/sessions.ts`, `app/(app)/student/sessions-list.tsx`, `app/(app)/student/session-components/*` |
| `rate-session.ts` | 200 | `actions/student.ts` (rateSession, canRateSession), `app/(app)/student/rate-session-form.tsx`, `session-components/rate-session-floating.tsx` |

**Cron shells:** `api/cron/unlock-expired-slots/route.ts` → `cancel-session.ts`.

---

### 4.7 `features/payments/` — Stripe Connect & payouts (4 files)

| Target file | ~LOC | Merged from |
|-------------|------|-------------|
| `stripe-webhook.ts` | 300 | `api/stripe/webhook/route.ts`, webhook-related logic from `actions/student.ts`, `actions/stripe-connect.ts` |
| `connect-onboarding.ts` | 250 | `actions/stripe-connect.ts` (createAccountLink, refreshConnectStatus, resolveStoredStripeAccountId), `api/stripe/connect/create|finalize|refresh|return/route.ts`, `app/(app)/tutor/stripe/*` |
| `payout-ledger.ts` | 280 | `actions/stripe-connect.ts` (createPayoutLedgerForSession, payout dashboard), `actions/reconciliation.ts` (payout overlap), `api/cron/process-payouts/route.ts` |
| `payout-dashboard.tsx` | 200 | `app/(app)/tutor/payout-dashboard.tsx`, `tutor-earnings-chart.tsx` |

---

### 4.8 `features/tutor/` — Tutor operations (6 files)

Split `actions/tutor.ts` (1,824 LOC) into **six capability files** (~250–320 LOC each).

| Target file | ~LOC | Merged from |
|-------------|------|-------------|
| `command-center.ts` | 300 | `actions/tutor.ts` (getTutorCommandCenterData, TutorCommandCenterPayload), `app/(app)/tutor/tutor-command-center-client.tsx`, `tutor-dashboard-client.tsx`, `components/tutor-hub-realtime-refresh.tsx` |
| `availability.ts` | 320 | `actions/tutor.ts` (createAvailabilitySlots, deleteAvailability, setAvailabilityActive, getTutorAvailability), `create-availability-form.tsx`, `availability-manager.tsx`, `components/ui/create-availability-card.tsx`, `lib/teaching-defaults.ts` |
| `session-requests.ts` | 280 | `actions/tutor.ts` (getSessionRequests, approve/reject), `session-requests-list.tsx`, `auto-approve-toggle.tsx` |
| `tutor-sessions.ts` | 280 | `actions/tutor.ts` (getUpcomingSessions, getPastSessions, completeSession, cancelSession), `sessions-list.tsx`, `tutor-session-actions.tsx`, `tutor-week-calendar.tsx` |
| `courses.ts` | 250 | `actions/tutor.ts` (getTutorCourses, add/remove, upload evidence), `course-manager.tsx`, `actions/tutor-quality.ts`, `components/tutor-quality-badge.tsx`, `lib/tutor-quality.ts` |
| `public-profile.tsx` | 200 | `actions/tutor.ts` (getTutorPublicProfile, getTutorDashboardForAdmin), `app/(app)/tutor/[tutorId]/*`, `components/tutor/*` decor/greeting |

**Page shells:** `app/(app)/tutor/page.tsx` imports `command-center.ts`.

---

### 4.9 `features/video/` — WebRTC sessions & recordings (4 files)

| Target file | ~LOC | Merged from |
|-------------|------|-------------|
| `join-session.ts` | 250 | `actions/video.ts` (validateJoinRequest), `app/(app)/video/session/[sessionId]/page.tsx`, `components/join-video-call-button.tsx` |
| `video-call.tsx` | 300 | `components/video-call.tsx`, `components/video/*` (connection-quality, in-session-chat, whiteboard, pre-call-lobby, post-call-summary), `lib/webrtc.ts` |
| `recordings.ts` | 200 | `actions/recordings.ts`, `api/recordings/upload/route.ts`, `lib/recordings/save-session-recording-from-formdata.ts` |
| `session-bundles.ts` | 75 | `actions/session-bundles.ts` |

**Cron shells:** `api/cron/complete-sessions/route.ts`, `enforce-session-timing/route.ts` → import from `join-session.ts` / `recordings.ts`.

---

### 4.10 `features/studio-ai/` — AI studio packages & transcription (4 files)

Split `actions/autoPilot.ts` (1,366 LOC).

| Target file | ~LOC | Merged from |
|-------------|------|-------------|
| `studio-packages.ts` | 300 | `actions/autoPilot.ts` (generate, save, publish, delete, getSessionPackage, autoGenerate), `lib/studio-package.ts`, `app/(app)/tutor/sessions-ai/*`, `components/tutor-studio-realtime-refresh.tsx`, `api/tutor/studio-stream/route.ts` |
| `transcription-jobs.ts` | 250 | `actions/autoPilot.ts` (processPendingRecordingTranscriptionJobs, enqueueRecordingTranscriptionJobsForSessions), `api/cron/process-recording-transcriptions/route.ts` |
| `session-ai-context.ts` | 120 | `actions/session-ai-context.ts` |
| `study-package-panel.tsx` | 150 | `app/(app)/student/session-components/study-package-panel.tsx`, `student-study-package-notifier.tsx`, `tutor-past-ai-generate.tsx` |

---

### 4.11 `features/pre-session-brief/` — AI briefs (2 files)

| Target file | ~LOC | Merged from |
|-------------|------|-------------|
| `brief.ts` | 280 | `actions/pre-session-brief.ts`, `api/cron/pre-session-brief/route.ts` |
| `brief-card.tsx` | 100 | `components/pre-session-brief-card.tsx` |

---

### 4.12 `features/quest/` — Quest solver & practice (5 files)

| Target file | ~LOC | Merged from |
|-------------|------|-------------|
| `classic-quest.ts` | 300 | `actions/quest.ts` (submitQuest, submitQuestAnswer, generateQuestVariants, quest history), `app/(app)/student/quest/quest-classic-workspace.tsx`, `quest-page-client.tsx`, `components/quest/*` |
| `practice-quest.ts` | 280 | `actions/practice-quest.ts`, `quest-practice-workspace.tsx`, `lib/practice-quest-types.ts`, `lib/practice-fallback-questions.ts` |
| `guest-practice.ts` | 200 | `api/guest-practice/route.ts`, `app/(marketing)/try/guest-quest-client.tsx`, `app/(marketing)/try/page.tsx`, `lib/guest-try-types.ts`, `lib/guest-mixed-fallback.ts` |
| `quest-reads.ts` | 200 | `actions/quest.ts` (getQuestAccuracyTrend, getInProgressQuestPreview, getCurrentUserXp reads), `student-stat-strip-motion.tsx` |
| `diagnostic-onboarding.ts` | 155 | `actions/diagnostic-onboarding.ts`, `lib/diagnostic-onboarding-plan.ts`, `app/(app)/student/onboarding/*` |

---

### 4.13 `features/divisions/` — Divisions, leaderboards, arena (4 files)

| Target file | ~LOC | Merged from |
|-------------|------|-------------|
| `division-hub.ts` | 280 | `actions/divisions.ts`, `actions/quest.ts` (getDivisionsCatalog, setFocusedDivision, getActiveDivisions), `app/(app)/student/division/*`, `lib/division-ui.ts`, `lib/division-focus-icons.ts`, `lib/arena-division-focus.ts` |
| `leaderboard.ts` | 250 | `actions/quest.ts` (getDivisionLeaderboard, getStudentDivisionStats), `api/cron/refresh-division-leaderboard/route.ts`, `components/student/leaderboard-tier-rank.tsx` |
| `division-weekly.ts` | 85 | `actions/division-weekly.ts`, `api/cron/division-weekly/route.ts` |
| `top-rival.ts` | 110 | `actions/top-rival.ts`, `components/top-rival-card.tsx` |

---

### 4.14 `features/xp/` — Gamification kernel (3 files)

XP is cross-cutting but **small enough to stay 3 files**, not a layer explosion. Other features call `applyXpAward` — this is intentional shared kernel, not duplication.

| Target file | ~LOC | Merged from |
|-------------|------|-------------|
| `xp-awards.ts` | 280 | `actions/xp.ts`, `lib/xp-constants.ts`, `lib/xp-events.ts`, `lib/levels.ts`, `lib/mentrixa-ranks.ts`, `lib/rank-icons.ts`, `lib/pwa-xp-queue.ts`, `api/pwa/xp-sync/route.ts`, `api/student/streak-ui/route.ts` |
| `xp-ui.tsx` | 200 | `components/xp-counter.tsx`, `components/floating-xp-animations.tsx`, `components/student/account-rank-*`, `student-nav-rank-strip.tsx`, `rank-badge.tsx`, `lib/mentrix-student-ui.ts`, `lib/confetti-burst.ts` |
| `duel-reward.ts` | 160 | `lib/duel-reward.ts`, `lib/duel-constants.ts` |

---

### 4.15 `features/duels/` — Skill duels (5 files)

Split `actions/duel.ts` (1,741 LOC) by **lifecycle stage**.

| Target file | ~LOC | Merged from |
|-------------|------|-------------|
| `duel-create.ts` | 280 | `actions/duel.ts` (createSkillDuel, createClanSkillDuel) |
| `duel-queue.ts` | 300 | `actions/duel.ts` (join/leave/poll queue, accept/decline match, getQueueMatchAcceptance) |
| `duel-gameplay.ts` | 300 | `actions/duel.ts` (activate, accept/decline, submit answers, withdraw, hide) |
| `duel-reads.ts` | 280 | `actions/duel.ts` (getDuelForUser, listStudentDuels, getDuelHistorySummary, previews) |
| `duel-ui.tsx` | 300 | `app/(app)/student/duel/*`, `components/duel/*`, `components/student/your-duels-list.tsx`, `duel-row-actions.tsx`, `lib/duel-fallback-questions.ts`, `lib/duel-audio-controller.ts`, `lib/duel-reward.ts` (imports xp kernel) |

---

### 4.16 `features/clans/` — Clan social (4 files)

| Target file | ~LOC | Merged from |
|-------------|------|-------------|
| `clan-crud.ts` | 280 | `actions/clan.ts` |
| `clan-dashboard.ts` | 280 | `actions/clan-dashboard.ts` |
| `clan-ui.tsx` | 300 | `app/(app)/student/clan/*`, `components/clan/*`, `lib/clan-constants.ts`, `lib/clan-light-form-ui.ts` |

---

### 4.17 `features/resolve/` — AI problem solver (3 files)

| Target file | ~LOC | Merged from |
|-------------|------|-------------|
| `resolve.ts` | 240 | `actions/resolve.ts` |
| `resolve-ui.tsx` | 200 | `app/(app)/student/resolve/*`, `components/resolve/*` |
| `resolve-illustration.tsx` | 80 | `components/illustrations/QuestIllustration.tsx` (if only used here) |

---

### 4.18 `features/learning-path/` — Knowledge graph (3 files)

| Target file | ~LOC | Merged from |
|-------------|------|-------------|
| `knowledge-graph.ts` | 190 | `actions/knowledge-graph.ts`, `lib/knowledge-graph.ts`, `lib/embeddings.ts`, `lib/stem-bucket.ts` |
| `learning-path-ui.tsx` | 200 | `app/(app)/student/learning-path/*`, `components/learning/skill-tree.tsx`, `subject-progress-ring.tsx` |
| `progress-dashboard.tsx` | 130 | `actions/student-progress.ts`, `app/(app)/student/progress/*` |

---

### 4.19 `features/student-profile/` — Student identity & hub (4 files)

| Target file | ~LOC | Merged from |
|-------------|------|-------------|
| `hub-snapshot.ts` | 300 | `actions/student.ts` (getStudentHubSnapshot, getStudentSessionsHubBundle, cache invalidation), `lib/student-dashboard-helpers.ts`, `components/student-hub-realtime-refresh.tsx` |
| `student-dashboard.tsx` | 280 | `app/(app)/student/page.tsx`, `student-command-center-client.tsx`, `student-dashboard-deferred.tsx`, `student-week-calendar.tsx`, `course-interests.tsx`, `student-course-chips.tsx` |
| `student-profile.ts` | 280 | `actions/student-profile.ts`, `lib/student-profile.ts`, `app/(app)/student/[studentId]/*` |
| `student-courses.ts` | 120 | `actions/student.ts` (getStudentCourses, add/remove), `actions/student.ts` course helpers |

**Admin read:** `app/(app)/admin/student/[studentId]/page.tsx` → thin shell importing `student-dashboard.tsx` + `hub-snapshot.ts`.

---

### 4.20 `features/referrals/` — Referral program (2 files)

| Target file | ~LOC | Merged from |
|-------------|------|-------------|
| `referrals.ts` | 175 | `actions/referral.ts`, `lib/referral-constants.ts`, `lib/referral-monthly-cap.ts`, `api/referral/finalize/route.ts` |
| `referral-ui.tsx` | 100 | `components/student/referral-program-section.tsx` |

---

### 4.21 `features/institutions/` — B2B institution portal (3 files)

| Target file | ~LOC | Merged from |
|-------------|------|-------------|
| `institution.ts` | 280 | `actions/institution.ts`, `lib/institution-credits.ts` |
| `institution-layout.tsx` | 200 | `app/(app)/institution/[institutionId]/*` (all sub-pages) |
| `institution-billing.tsx` | 150 | billing + usage clients |

---

### 4.22 `features/marketing/` — Landing, contact, legal (4 files)

| Target file | ~LOC | Merged from |
|-------------|------|-------------|
| `landing-page.tsx` | 300+ | Split into `landing-page.tsx` + `landing-sections.tsx` only if combined >300 LOC. Merges: `app/(marketing)/page.tsx`, `components/landing/**`, `components/landing/v2/**`, scroll sequences, `lib/landing-stats.ts`, `lib/landing-perf.ts`, `api/stats/landing/route.ts` |
| `marketing-shell.tsx` | 200 | `app/(marketing)/layout.tsx`, `marketing-shell-client.tsx`, `marketing-landing-nav.tsx`, `home-page-client.tsx` |
| `contact.ts` | 120 | `actions/contact.ts`, `api/feedback/route.ts`, `app/(marketing)/contact/*`, `components/contact/*` |
| `legal-pages.tsx` | 100 | `app/(app)/privacy/page.tsx`, `app/(app)/terms/page.tsx`, `components/organization-json-ld.tsx` |

**Shared marketing data:** `src/data/globe-land-110m.json` → `features/marketing/data/` (only used by landing globe).

---

### 4.23 `features/notifications/` — Push & reminders (3 files)

| Target file | ~LOC | Merged from |
|-------------|------|-------------|
| `push-subscribe.ts` | 120 | `api/push/subscribe/route.ts`, `api/push/vapid-public/route.ts` |
| `reminders.ts` | 150 | `api/cron/send-reminders/route.ts` |
| `pwa-context.ts` | 80 | `api/student/pwa-context/route.ts` |

---

### 4.24 `features/jobs/` — Background job infrastructure (3 files)

| Target file | ~LOC | Merged from |
|-------------|------|-------------|
| `queue.ts` | 250 | `lib/jobs/enqueue.ts`, `claim.ts`, `process.ts`, `queue-helpers.ts`, `types.ts` |
| `worker.ts` | 200 | `lib/jobs/handlers/index.ts`, `api/cron/process-background-jobs/route.ts` |
| `handlers.ts` | 280 | `lib/jobs/handlers/email.ts`, `analytics.ts`, `brief.ts`, `payout.ts`, `studio-package.ts`, `transcription.ts` — **handlers call feature entrypoints, not vice versa** |

**Dependency fix:** Handlers import from `@/features/pre-session-brief/brief`, `@/features/payments/payout-ledger`, etc. Features never import from `jobs/handlers`.

---

### 4.25 `features/analytics/` — Tracking & health (2 files)

| Target file | ~LOC | Merged from |
|-------------|------|-------------|
| `track.ts` | 80 | `api/track/route.ts` |
| `health.ts` | 40 | `api/health/route.ts` |

---

### 4.26 App shell & navigation (stays thin, not a "feature")

| Target file | ~LOC | Merged from |
|-------------|------|-------------|
| `shared/ui/app-shell.tsx` | 200 | `app/layout.tsx`, `app/(app)/layout.tsx`, `components/root-layout-client.tsx`, `components/navigation.tsx`, `student-navbar.tsx`, `tutor-navbar.tsx`, `components/cookie-consent-banner.tsx`, `dev-service-worker-guard.tsx`, `console-silencer.tsx`, `ui-performance-bootstrap.tsx` |
| `shared/ui/first-login-tours.tsx` | 150 | `student-first-login-tour.tsx`, `tutor-first-login-tour.tsx`, `first-login-tour-panel.tsx` |

---

## 5. What We Explicitly Do NOT Create

| Anti-pattern | Our rule |
|--------------|----------|
| `AuthController.ts` + `AuthService.ts` + `AuthRepository.ts` | One `sign-in.ts` per capability |
| `types/auth.ts` + `schemas/auth.ts` + `dto/auth.ts` | Types live at top of the same file |
| `interfaces/IStripeGateway.ts` | Call `shared/integrations/stripe/` directly |
| Per-entity folders with 8 files | Folder = domain; files = user journeys (max ~6 per domain) |
| Shared `helpers/` dumping ground | Must justify 2+ feature consumers or stay local |

---

## 6. High-Risk Coupling & De-Bloat Strategy

### 6.1 God Objects → Capability Splits (not layer splits)

| Current god file | Split into | Rule |
|------------------|------------|------|
| `tutor.ts` (1,824) | 6 files in `features/tutor/` | Split when >300 LOC per journey |
| `duel.ts` (1,741) | 5 files in `features/duels/` | Split by lifecycle: create → queue → play → read |
| `student.ts` (1,334) | 4 in `booking/` + 4 in `student-profile/` | Booking ≠ hub ≠ courses |
| `quest.ts` (1,224) | 3 in `quest/` + 2 in `divisions/` | Quest solving ≠ leaderboard infrastructure |
| `autoPilot.ts` (1,366) | 3 in `studio-ai/` | Studio CRUD ≠ transcription jobs |

### 6.2 Cross-Feature Dependencies (allowed vs forbidden)

| Dependency | Verdict | Strategy |
|------------|---------|----------|
| Many features → `xp/xp-awards.ts` | **Allowed** | Small stable kernel (~280 LOC). Document as shared gamification contract. |
| `duels` → `clans` | **Allowed** | Import clan read helpers; no circular imports (clans must not import duels). |
| `quest` → `xp` | **Allowed** | One-way. |
| `lib/jobs/handlers` → `app/actions` | **Forbidden** (today) | Reverse: jobs call feature entrypoints. |
| `student-dashboard` → 6 action files | **Fix** | `hub-snapshot.ts` becomes facade; page imports 1–2 files max. |
| `proxy.ts` → everything | **Isolate** | Keep routing table in `shared/core/proxy.ts`; features register public paths via const array export |

### 6.3 Circular Dependency Prevention

```
features/*  →  shared/*  →  (never imports features)
features/A  →  features/B  →  only one direction; extract to shared if mutual
```

If `auth` and `registration` need each other: extract `shared/core/user-lifecycle.ts` with **only** shared types + status normalization (~80 LOC), not business logic.

### 6.4 Large Static Data

| File | Lines | Action |
|------|-------|--------|
| `lib/practice-fallback-questions.ts` | 1,159 | Keep as **single data file** in `features/quest/data/fallback-questions.ts` — data is not "layer" |
| `lib/guest-mixed-fallback.ts` | 954 | `features/quest/data/guest-fallback.ts` |
| `lib/mentrixa-sounds.ts` | 292 | `shared/integrations/sounds.ts` if used by multiple UIs, else feature-local |

---

## 7. Migration Sequence (Low Risk → High Risk)

Each phase ends with: tests green, thin shells working, old path re-export shim (optional `@/app/actions/x` → `@/features/...` for one release).

| Phase | Feature | Risk | Why this order |
|-------|---------|------|----------------|
| **0** | `shared/core` + `shared/integrations` | Low | Move infra first; features import new paths |
| **1** | `analytics`, `contact` | Very low | Isolated, no cross-deps |
| **2** | `marketing` | Low | Mostly UI; few action deps |
| **3** | `settings` | Low | Single action file, 2 consumers |
| **4** | `referrals` | Low | One xp call |
| **5** | `resolve` | Low-Med | Self-contained AI feature |
| **6** | `learning-path`, `progress` | Low-Med | Narrow surface |
| **7** | `institutions` | Med | Isolated B2B portal |
| **8** | `verification` | Med | Touches auth on signup only |
| **9** | `registration` + `admin` | Med | Admin depends on registration reads |
| **10** | `xp` kernel | Med | **Extract before more gamification moves** |
| **11** | `quest` + `divisions` | Med | Leaderboard crons |
| **12** | `clans` | Med | Duels depend on it — migrate before duels |
| **13** | `duels` | Med-High | Many exports; clan + xp deps |
| **14** | `pre-session-brief`, `studio-ai` | Med-High | Job handler deps |
| **15** | `video` + `recordings` | High | WebRTC + storage + crons |
| **16** | `payments` | High | Stripe webhook raw body constraints |
| **17** | `tutor` | High | 1,824 LOC split |
| **18** | `booking` | High | Stripe + student + tutor intersection |
| **19** | `student-profile` hub | High | Aggregates many features — **facade last** |
| **20** | `auth` + `proxy` | Highest | Touches every route; migrate last |
| **21** | `jobs/worker` | High | Wire handlers after features exist |
| **22** | Delete `app/actions/`, `src/lib/` shims | Cleanup | |

**Pilot recommendation:** Phase 1 `contact.ts` — merges 4 files, ~120 LOC, zero cross-feature imports. Proves colocation pattern without risk.

---

## 8. Import Path Migration

| Old | New |
|-----|-----|
| `@/lib/auth` | `@/shared/core/auth` |
| `@/lib/supabase/server` | `@/shared/integrations/supabase/server` |
| `@/lib/security` | `@/shared/core/security` |
| `@/app/actions/student` | `@/features/booking/book-session` (specific import, not barrel) |
| `@/components/ui/button` | `@/shared/ui/button` |

**No barrel files** (`features/booking/index.ts` exporting everything). Import the specific capability file. This prevents hidden coupling and tree-shaking issues.

---

## 9. Test Colocation Plan

| Current | Target |
|---------|--------|
| `tests/unit/booking-pricing.test.ts` | `features/booking/browse-availability.test.ts` |
| `tests/unit/xp-awards.test.ts` | `features/xp/xp-awards.test.ts` |
| `tests/unit/stripe-webhook-contract.test.ts` | `features/payments/stripe-webhook.test.ts` |
| `e2e/booking.spec.ts` | `e2e/booking.spec.ts` (stays; e2e is cross-journey) |

Unit tests move next to features. E2E stays at repo root — it validates journeys across slices.

---

## 10. File Count Summary

| Area | Current files | Target files | Delta |
|------|---------------|--------------|-------|
| Server actions | 35 | 0 (replaced) | −35 |
| Feature capability files | 0 | ~78 | +78 |
| `lib/` | 129 | 0 (replaced) | −129 |
| `shared/` | 0 | ~32 | +32 |
| `components/` (domain) | ~160 | 0 (colocated) | −160 |
| `components/ui/` | ~36 | 0 (→ shared/ui) | −36 |
| Feature UI files | 0 | ~45 | +45 |
| API route shells | 40 | 40 | 0 (thinned) |
| App page shells | ~160 | ~160 | 0 (thinned) |

**Net:** Fewer total files than today (~572 TS/TSX in `src/` → ~355), with **no file >350 LOC** except intentional data blobs and `security.ts`.

---

## 11. Definition of Done (Per Feature Migration)

- [ ] All logic for the capability lives in one feature file (or justified split at 300 LOC)
- [ ] File follows 4-section internal ordering (imports → types → helpers → exports)
- [ ] Route/page shells are ≤15 LOC
- [ ] No new file created without a consumer or a >300 LOC split justification
- [ ] Unit tests pass; e2e smoke pass for affected journeys
- [ ] No `lib → actions` imports remain for that feature
- [ ] Old paths have deprecated re-export shim (one release cycle)

---

## 12. Open Decisions (Resolve Before Phase 0)

1. **Route colocation:** Keep `app/(app)/student/` URLs as-is (recommended) vs. move to `app/(app)/` flat routes.
2. **Illustrations folder:** `components/illustrations/` — merge into respective feature UI files or one `shared/ui/illustrations.tsx` if used only for empty states.
3. **`quest.ts` division exports:** Move leaderboard reads to `divisions/leaderboard.ts` in Phase 11 (recommended) to eliminate `divisions.ts` importing from `quest.ts`.

---

*This plan prioritizes navigability and change-isolation over architectural purity. One file per user journey, one folder per business domain, one shared layer for true cross-cutting concerns.*
