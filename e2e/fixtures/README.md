# E2E fixtures & environment

Playwright tests use `PLAYWRIGHT_BASE_URL` (default `http://127.0.0.1:3000`) and optionally:

| Variable | Purpose |
|----------|---------|
| `E2E_TUTOR_ID` | Staging tutor UUID — booking smoke only |
| `E2E_STUDENT_EMAIL` | Student account email for signed-in flows (`*e2e*@example.com` preferred) |
| `E2E_STUDENT_PASSWORD` | Student account password |
| `E2E_TUTOR_EMAIL` / `E2E_TUTOR_PASSWORD` | Guide account for booking video (`*e2e*@example.com` preferred) |
| `NEXT_PUBLIC_SUPABASE_URL` | Non-production Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — must not be a CI placeholder |
| `WAITLIST_ENABLED` | Set `false` locally for simplest signup activate path (default in CI) |

**Hard rule:** guest-chain and booking video e2e refuse `PLAYWRIGHT_BASE_URL` / `NEXT_PUBLIC_APP_URL` pointing at `mentrixa.one`. Cron pings and CI health checks may hit production; they never create Mentrixers.

Synthetic accounts use `e2e.chain.*@example.com` emails and `e2e-chain-*` usernames. Product surfaces (Arena, public rank, browse Guides, OG) hide them from everyone except the account owner on their own rank page. Purge leftovers with `npm run purge:e2e-users -- --dry-run` then `--confirm`.

Without student credentials, tests that need login are skipped (`test.skip`).

`e2e/guest-diagnostic-to-rank.spec.ts` needs a live **non-prod** app, AP Calculus AB item bank data, and real Supabase credentials. It is skipped when `SUPABASE_SERVICE_ROLE_KEY` is missing, a placeholder, or the target is production Mentrixa.

Guest diagnostic **start** is stubbed in Playwright (`/api/guest-diagnostic/start`) so the chain is not blocked by per-IP demo rate limits. Signup uses the real signup shell, then provisions the student via Supabase admin and signs in. Practice pack, VFA rows, and rank passport still hit real APIs and Supabase.

Stripe checkout is not mocked in-repo; full “pay → confirm session” flows need a test Stripe key and are documented as manual/CI follow-up.
