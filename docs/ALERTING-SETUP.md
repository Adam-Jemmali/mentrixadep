# Alerting Setup (Health, Checkout, Webhook, Realtime)

This runbook defines minimal production alerts and launch gates for first-50-users reliability.

## 1) Health Alert

Monitor:

- URL: `GET /api/health`
- Expected: HTTP 200 and JSON `ok: true`

Trigger:

- Alert if status is not 200 for 2 consecutive checks (1-minute interval).

Severity:

- Critical

## 2) Checkout Errors Alert

Signal source:

- Vercel logs for `/api/stripe/checkout`

Patterns to alert on:

- `[stripe/checkout] error:`
- HTTP `5xx` on `/api/stripe/checkout`
- Spike in HTTP `409` conflicts over baseline (possible slot contention or abuse)

Suggested thresholds:

- Critical: >= 5 failures (5xx) in 5 minutes
- Warning: conflict rate > 20% for 10 minutes

## 3) Webhook Failures Alert

Signal source:

- Vercel logs for `/api/stripe/webhook`

Patterns to alert on:

- `[webhook] signature verification failed`
- `[webhook] handler error`
- `stripe-webhook-` in unexpected error capture

Suggested thresholds:

- Critical: any signature verification failures sustained for 3+ minutes
- Critical: >= 3 handler failures in 5 minutes

## 4) Realtime Disconnect Spike Alert

Primary signal:

- Client telemetry event volume for `realtime_disconnect`

Implementation note:

- Emit `trackClientEvent("realtime_disconnect", { channel, reason })` on disconnect statuses.
- Emit `trackClientEvent("realtime_reconnect", { channel, reason: "subscribed" })` on reconnect/subscribed statuses.

Suggested thresholds:

- Warning: > 10 disconnects in 5 minutes
- Critical: > 30 disconnects in 5 minutes

## 5) Optional DB-side Checks (Supabase SQL)

Checkout + webhook sanity trend (last 30 minutes):

```sql
select
  count(*) filter (where event_name = 'checkout_started') as checkout_started,
  count(*) filter (where event_name = 'checkout_abandoned') as checkout_abandoned,
  count(*) filter (where event_name = 'checkout_completed') as checkout_completed,
  count(*) filter (where event_name = 'session_booked') as session_booked
from analytics_events
where created_at >= now() - interval '30 minutes';
```

Recent webhook processing log volume:

```sql
select event_type, count(*)
from stripe_webhook_log
where processed_at >= now() - interval '30 minutes'
group by event_type
order by count(*) desc;
```

Realtime disconnect trend (last 30 minutes):

```sql
select
  coalesce(properties->>'channel', 'unknown') as channel,
  coalesce(properties->>'reason', 'unknown') as reason,
  count(*) as total
from analytics_events
where event_name = 'realtime_disconnect'
  and created_at >= now() - interval '30 minutes'
group by 1, 2
order by total desc;
```

## 6) Recommended Notification Routing

- Critical alerts: Pager + Slack
- Warning alerts: Slack channel only
- Include runbook links and owner contact in each alert payload

## 7) Migration 053 Production Verification

Migration file:

- `supabase/053-production-hardening-signup-and-search-path.sql`

What this migration enforces:

- Admin self-promotion during signup is blocked
- `search_path` is pinned for security-definer functions
- Signup trigger remains functional for normal student/tutor registrations

Verification SQL to run in production:

```sql
-- A) Function has explicit pinned search_path
select n.nspname as schema_name,
       p.proname as function_name,
       p.proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'is_approved_tutor',
    'is_approved_student',
    'is_admin',
    'update_user_jwt_metadata',
    'auto_complete_sessions',
    'handle_auto_approve_session_request',
    'validate_rating_session',
    'seed_admin_user',
    'is_auto_approve_registrations',
    'create_user_verification'
  )
order by p.proname;

-- B) Signup hardening function exists and is SECURITY DEFINER
select n.nspname as schema_name,
       p.proname as function_name,
       p.prosecdef as is_security_definer,
       p.proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'handle_new_user_with_jwt';

-- C) Verify new signup cannot self-promote to admin (run in a safe staging/prod-like env)
-- Create a user through normal auth signup with metadata role='admin'.
-- Expected in public.users: role resolves to 'student' unless server-side trusted path sets otherwise.
```

Operational note:

- Production execution itself must be done from your Supabase production console/CI deploy job. This repository cannot directly run against your production database from this environment.

## 8) 24-Hour Soak Before Marketing

Run a 24-hour soak after alerts and migration verification are complete.

Checklist:

- Keep staging Stripe smoke scheduled (already every 30 minutes)
- Watch critical alert channels and Pager for 24 hours
- Watch warning alert noise and error budget drift
- Confirm no sustained webhook failures or checkout 5xx spikes
- Confirm realtime disconnect volume stays within expected range

Go/No-Go:

- Go: no critical alerts for 24h and staging smoke remains green
- No-Go: any sustained critical signal or repeated smoke failures

## 9) Launch Decision (First 50 Users)

Proceed with marketing when all are true:

- Health checks stable
- Checkout/webhook alerts stable
- Realtime disconnect alerts stable with real client telemetry data
- Migration 053 verified in production
- 24-hour soak clean and staging smoke green
