# Pre-Launch Runbook (Vercel + Supabase)

This project is code-ready for launch. Use this checklist to close remaining deployment/runtime tasks.

## 1) Vercel Deployment Configuration

`vercel.json` is configured with:

- Region: `iad1` (US East) — **Hobby** allows a single function region only. Multi-region (`iad1` + `cdg1`) in `vercel.json` `functions.*.regions` requires **Pro**; removed to avoid deploy failures.
- Function durations (only real `app/api/**/route.ts` paths are valid in `vercel.json` `functions`):
  - default API routes: `10s` (`src/app/api/**/route.ts`)
  - tutor AI streaming: `60s` (`src/app/api/tutor/studio-stream/route.ts`)
  - If you add `src/app/api/video/**/route.ts`, add a `300s` entry for uploads in `vercel.json` (pattern must match an actual route file).
- Security headers via Vercel `headers` config
- **Cron schedules (`vercel.json`)** — defaults are **Vercel Hobby–safe**: each job runs **at most once per day** (staggered UTC hours). Hobby rejects schedules that run more than once per day; that was breaking deployments.
- **Vercel Pro** (or Enterprise): you can switch `crons` in `vercel.json` to higher-frequency expressions, for example:
  - `/api/cron/refresh-division-leaderboard`: `*/5 * * * *`
  - `/api/cron/unlock-expired-slots`: `*/10 * * * *`
  - `/api/cron/complete-sessions`: `*/15 * * * *`
  - `/api/cron/send-reminders`: `0 * * * *`
  - `/api/cron/pre-session-brief`: `*/15 * * * *`
  - `/api/cron/process-payouts`: `0 */6 * * *`
  - `/api/cron/verification-overdue`: `0 * * * *`
  - `/api/cron/division-weekly`: `15 0 * * 1` (weekly; unchanged)
- Alternatively on Hobby, keep daily Vercel crons and trigger high-frequency work via **Supabase `pg_cron`**, **GitHub Actions**, or another scheduler hitting the same routes with `CRON_SECRET`.

## 2) Production Environment Variables (with source)

Set in **Vercel -> Project Settings -> Environment Variables**:

- `NEXT_PUBLIC_SUPABASE_URL` -> Supabase project settings
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` -> Supabase project settings
- `SUPABASE_SERVICE_ROLE_KEY` -> Supabase project settings (**server-only**)
- `STRIPE_SECRET_KEY` -> Stripe dashboard (**live** secret key)
- `STRIPE_WEBHOOK_SECRET` -> Stripe webhook endpoint signing secret
- `GEMINI_API_KEY` -> Google AI Studio
- `RESEND_API_KEY` -> Resend dashboard
- `CRON_SECRET` -> generate with `openssl rand -hex 32`
- `NEXT_PUBLIC_APP_URL` -> `https://mentrixa.one`

Recommended hardening (also enforced on each `/api/cron/*` request in `lib/cron.ts`):

- `CRON_ALLOWED_IPS` (comma-separated allowlist), or
- `CRON_REQUIRE_SIGNATURE=true` for signed cron requests
- `CRON_REQUIRE_SIGNATURE=true` for signed cron requests

Startup logs a **warning** if neither is set so deploys succeed; set one of these before relying on scheduled crons in production.

## 3) Supabase Production Setup Checklist

### Database & platform

- Enable `pgvector` extension (for embeddings/search use cases).
- Enable daily backups / PITR (project settings).
- Enable connection pooling (PgBouncer) and use pooled connection string for concurrency-sensitive workloads.

### SQL launch audit

Run in order in Supabase SQL editor:

1. `supabase/044-fk-indexes-auto.sql`
2. `supabase/045-rls-audit-and-policy-template.sql`

Then:

- Review missing-policy table output.
- Apply reviewed per-table policies (do not apply blanket policies blindly).

### Edge Functions

- Deploy/verify Supabase Edge Functions for push notification workflows.
- Ensure required service keys/secrets are present in function env.

## 4) Stripe Production Checklist

- Create live webhook endpoint:
  - `https://mentrixa.one/api/stripe/webhook`
- Subscribe to events:
  - `checkout.session.completed`
  - `checkout.session.expired`
  - `payment_intent.payment_failed`
  - `customer.subscription.*` (future-proofing)
- Copy webhook signing secret into `STRIPE_WEBHOOK_SECRET`.
- Configure Stripe Radar rules as needed (for risk/region policy).

## 5) Health + Monitoring

Create monitors in Better Stack / Pingdom / equivalent:

- `GET /api/health` (should return 200 with `ok: true`)
- `GET /` (homepage)
- Optional synthetic monitor for sign-in + booking flow in staging

## 6) Manual QA Matrix (Release Gate)

Execute and record pass/fail evidence for:

- Booking flow end-to-end
- Stripe live-card and failure-path behavior
- Cross-browser video session (Chrome/Edge/Safari)
- XP trigger events (all expected award paths)
- Transactional email rendering (Gmail + Outlook)

## 7) Final Preflight Commands

Run locally before promoting release:

- `npm run lint`
- `npm run test:ci`
- `npm run build`
- `npm run analyze`

All must pass with no launch-blocking errors.

## 8) One-Shot Go-Live Sequence (First 50 Users)

Run this sequence in order to complete production readiness in one pass.

### A) Local release gate (single command)

Run:

- npm run release:verify

This executes lint + unit tests + E2E CI suite + production build.

### B) Apply production hardening migration

In production Supabase SQL editor, run:

- supabase/053-production-hardening-signup-and-search-path.sql

### C) Verify migration 053 and live telemetry shape

In production Supabase SQL editor, run:

- scripts/sql/prod-readiness-verification.sql

Pass criteria:

- handle_new_user_with_jwt is SECURITY DEFINER with pinned search_path
- listed legacy functions show pinned search_path in proconfig
- checkout/webhook/realtime events are queryable and non-erroring

### D) Ensure alert routes are live

Configure according to docs/ALERTING-SETUP.md:

- Critical alerts -> Pager + Slack
- Warning alerts -> Slack only

### E) Keep staging smoke scheduled

Workflow already scheduled every 30 minutes:

- .github/workflows/staging-smoke-stripe.yml

### F) 24-hour soak gate

Observe for 24 hours:

- No critical alerts
- Staging stripe smoke remains green
- No sustained checkout/webhook error spikes

### G) Marketing release decision

If A-F are all green, proceed with first-50-user marketing rollout.
