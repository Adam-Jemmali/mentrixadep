# E2E fixtures & environment

Playwright tests use `PLAYWRIGHT_BASE_URL` (default `http://127.0.0.1:3000`) and optionally:

| Variable | Purpose |
|----------|---------|
| `E2E_TUTOR_ID` | Real tutor UUID — public tutor profile / booking smoke |
| `E2E_STUDENT_EMAIL` | Student account email for signed-in flows |
| `E2E_STUDENT_PASSWORD` | Student account password |
| `NEXT_PUBLIC_SUPABASE_URL` | Real Supabase project URL (guest diagnostic chain + booking video) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — must not be a CI placeholder |
| `WAITLIST_ENABLED` | Set `false` locally for simplest signup activate path (default in CI) |

Without student credentials, tests that need login are skipped (`test.skip`).

`e2e/guest-diagnostic-to-rank.spec.ts` needs a live dev server, AP Calculus AB item bank data, and real Supabase credentials. It is skipped when `SUPABASE_SERVICE_ROLE_KEY` is missing or a placeholder.

Guest diagnostic **start** is stubbed in Playwright (`/api/guest-diagnostic/start`) so the chain is not blocked by per-IP demo rate limits. Signup uses the real signup shell, then provisions the student via Supabase admin and signs in. Practice pack, VFA rows, and rank passport still hit real APIs and Supabase.

Stripe checkout is not mocked in-repo; full “pay → confirm session” flows need a test Stripe key and are documented as manual/CI follow-up.
