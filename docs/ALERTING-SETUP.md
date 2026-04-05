# Alerting Setup (Health, Checkout, Webhook, Realtime)

This runbook defines minimal production alerts for first-50-users reliability.

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

- Client telemetry event volume for realtime disconnects (recommended custom event name: `realtime_disconnect`)

Implementation note:

- Send `trackEvent("realtime_disconnect", { channel, reason })` on reconnect/disconnect handlers.

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
where created_at >= now() - interval '30 minutes'
group by event_type
order by count(*) desc;
```

## 6) Recommended Notification Routing

- Critical alerts: Pager + Slack
- Warning alerts: Slack channel only
- Include runbook links and owner contact in each alert payload
