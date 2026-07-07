# Scaling Architecture — Mentrixa

This document describes how the app scales to ~10k users on the **Vercel + Supabase** stack (free/low-cost tier), CAP trade-offs, and the future **AWS ECS** path when budget allows.

---

## Current topology

```
Clients → Vercel CDN + Serverless Next.js → Supabase Postgres (CP)
                ↓                              ↑
         Upstash Redis (AP cache)         background_jobs queue
                ↓
         Vercel Cron → /api/cron/* → job workers (10 jobs/run)
                ↓
         Resend, Gemini, Stripe (async via queue)
```

| Layer | Technology | Role |
|-------|------------|------|
| Web | Vercel serverless | Horizontally scaled stateless functions |
| Cache | Upstash Redis (optional) | Rate limits, hub/leaderboard/stats, user meta |
| Database | Supabase PostgreSQL | Source of truth, job queue table |
| Jobs | `background_jobs` + Vercel Cron | Emails, AI packages, briefs, payouts |
| Observability | Sentry + `/api/health` | Errors and uptime |

---

## CAP theorem mapping

| Data | Consistency | Mechanism |
|------|-------------|-----------|
| Payments, bookings, duels | **Strong (CP)** | Atomic RPCs (`approve_session_request_atomic`, `duel_queue_join_and_match`), Stripe webhook idempotency |
| Leaderboards, hub, landing stats | **Eventual (AP)** | Redis TTL (30–300s) + materialized view refresh cron |
| Emails, AI, analytics | **Eventual (AP)** | Postgres job queue, at-least-once + idempotency keys |
| Rate limits | **Eventual (AP)** | Redis INCR+EXPIRE (slight overshoot acceptable) |

**Partition handling:** Jobs use `locked_at`, `locked_by`, `not_before`, and `(job_type, idempotency_key)` uniqueness.

---

## Redis (Upstash free tier)

Env vars:

```
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

| Key | TTL | Purpose |
|-----|-----|---------|
| `rl:sw:{identifier}` | window | Sliding rate limits |
| `leaderboard:{divisionId}:...` | 60s | Division leaderboard |
| `landing:stats:v2` | 300s | Marketing stats |
| `hub:{userId}` | 30s | Student hub RPC result |
| `user:meta:{userId}` | 600s | Auth metadata cache |

Code: [`src/lib/redis.ts`](../src/lib/redis.ts), [`src/lib/cache.ts`](../src/lib/cache.ts).

**Free tier limits:** ~10k commands/day — monitor Upstash dashboard; upgrade or narrow cache keys if exceeded.

---

## Background job queue

Migration: [`supabase/092-background-jobs.sql`](../supabase/092-background-jobs.sql)

| Job type | Enqueued by | Handler |
|----------|-------------|---------|
| `email.send` | Reminder crons | Resend via template |
| `ai.studio_package` | Session completion crons | Gemini studio package |
| `ai.brief` | Pre-session brief cron | Brief + email |
| `ai.transcription` | Session completion | Recording transcription worker |
| `payout.ledger` | Session completion | Stripe Connect ledger |
| `analytics.track` | Optional async path | `analytics_events` insert |

Worker cron: `GET /api/cron/process-background-jobs` every 15 minutes via [`.github/workflows/cron-background-jobs.yml`](../.github/workflows/cron-background-jobs.yml) (GitHub Actions + `CRON_SECRET`). Not in `vercel.json` (Hobby plan limit). Processes up to 50 jobs per run.

Code: [`src/lib/jobs/`](../src/lib/jobs/).

---

## Database performance

Migration: [`supabase/093-query-performance-indexes.sql`](../supabase/093-query-performance-indexes.sql)

- Partial index on scheduled sessions pending completion
- Analytics `(event_name, created_at desc)` index
- `get_user_rank(user_id, division_key)` RPC — replaces full `user_xp` scans
- Optimized `student_hub_snapshot` — tutor expertise scoped to tutors with future availability

Application fixes: paginated past sessions, admin user list, division activity feed join.

---

## Load testing (k6, free)

Install [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) locally, then:

```bash
npm run load:smoke
BASE_URL=https://your-staging-url npm run load:track
BASE_URL=https://your-staging-url npm run load:landing
```

Scripts: [`load-tests/`](../load-tests/).

**Pass criteria (staging):**

| Script | p95 target |
|--------|------------|
| smoke (`/api/health`) | < 500ms |
| track (`POST /api/track`) | < 200ms |
| landing (`GET /`) | < 2000ms |

Use Supabase Dashboard → Database → Query Performance after load tests.

---

## Horizontal scaling (Vercel, free)

Vercel already runs **N stateless instances** behind its edge network. Requirements:

1. No in-process singleton state (Redis for shared cache/limits)
2. Postgres job queue for background work
3. Idempotent webhooks and cron handlers

When Supabase Pro is enabled, turn on **connection pooling** (transaction mode) for any direct Postgres clients.

---

## Free tier honest limits

| Service | Free tier constraint | At ~10k users |
|---------|---------------------|---------------|
| Supabase | 500MB DB, bandwidth caps | **Upgrade to Pro ($25/mo)** likely required |
| Vercel | Cron limits on Hobby | Pro if >2 crons needed on Hobby |
| Upstash | 10k Redis commands/day | Use cache selectively |
| Resend/Gemini | API quotas | Monitor usage |

This architecture is **scale-ready in code**; infra tier upgrades are the expected paid step—not a rewrite.

---

## Future: AWS ECS path (~$35+/mo)

When revenue justifies paid infra:

```
ALB → ECS Fargate (2+ Next.js standalone tasks)
    → ElastiCache Redis
    → Dedicated worker service (BullMQ or Postgres workers)
    → Supabase Postgres (unchanged)
```

Steps:

1. `output: 'standalone'` in `next.config.mjs` + `Dockerfile`
2. ECS task definition + ALB + auto-scaling on CPU
3. Move crons to EventBridge → ECS worker **or** keep Vercel crons hitting `/api/cron/*`
4. Point DNS from Vercel to ALB

---

## Deploy checklist

1. Apply SQL migrations `092` and `093` in Supabase SQL Editor
2. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Vercel
3. Set `CRON_SECRET` and verify crons with `npm run cron:verify`
4. Run `npm run load:smoke` against production/staging after deploy
5. Monitor Sentry + Supabase query performance weekly

See also: [`docs/ALERTING-SETUP.md`](./ALERTING-SETUP.md), [`docs/SECURITY-HARDENING-RUNBOOK.md`](./SECURITY-HARDENING-RUNBOOK.md).
