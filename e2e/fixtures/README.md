# E2E fixtures & environment

Playwright tests use `PLAYWRIGHT_BASE_URL` (default `http://127.0.0.1:3000`) and optionally:

| Variable | Purpose |
|----------|---------|
| `E2E_TUTOR_ID` | Real tutor UUID — public tutor profile / booking smoke |
| `E2E_STUDENT_EMAIL` | Student account email for signed-in flows |
| `E2E_STUDENT_PASSWORD` | Student account password |

Without student credentials, tests that need login are skipped (`test.skip`).

Stripe checkout is not mocked in-repo; full “pay → confirm session” flows need a test Stripe key and are documented as manual/CI follow-up.
