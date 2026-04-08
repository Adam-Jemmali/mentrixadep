# Security Hardening Runbook

## Scope
- Auth abuse controls (`/api/auth/signin`, `/api/auth/signup`)
- Gemini/AI rate limiting and quotas
- RLS hardening migrations (`063`, `064`, `065`, `066`)

## Pre-deploy checks
- Run `npm run lint` and `npm run test:ci`.
- Confirm env vars in production:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `GEMINI_API_KEY`
  - Optional adaptive CAPTCHA: `TURNSTILE_SECRET_KEY`

## Migration order
- Apply SQL files in numeric order:
  - `063-rls-stripe-webhook-and-security-rate-limits.sql`
  - `064-align-admin-rls-with-is-admin.sql`
  - `065-quests-solution-access.sql`
  - `066-auth-abuse-locks.sql`

## Staging validation
- **Auth brute force**
  - Fail sign-in 5+ times for same email; verify lockout response with `429` + `retryAfterSeconds`.
  - Verify logs include `[auth-lockout]` and `[security-rate-limit-denied]`.
- **Adaptive CAPTCHA**
  - If `TURNSTILE_SECRET_KEY` is configured, fail sign-in repeatedly to trigger risk branch and confirm `captchaRequired`.
- **Gemini limits**
  - Repeatedly call quest/resolve/studio AI actions until throttled; ensure user-friendly rate-limit messages only.
- **RLS**
  - Validate `authenticated` cannot read `security_rate_limits`, `stripe_webhook_log`, or `quests.solution`.

## Rollout tuning
- Start with existing thresholds:
  - Sign-in IP burst: `20/5min`
  - Sign-in email burst: `10/15min`
  - Sign-in ip+email burst: `8/15min`
  - Lockout starts at 5 failures, exponential cooldown up to 60 minutes.
- Tighten only if attack volume persists; avoid impacting legitimate users.

## Incident response quick actions
- Temporarily reduce rate limits in `RATE_LIMITS` for hot mitigation.
- Enforce CAPTCHA globally by requiring token at first attempt (temporary patch).
- Rotate `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` if compromise is suspected.

