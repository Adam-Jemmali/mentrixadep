# Stripe Payout End-to-End (Test Mode)

This sequence validates the full payout lifecycle in Stripe test mode.

## Required env

Set these locally (or pull from Vercel first):

- `STAGING_SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`)
- `STAGING_SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`)
- `STRIPE_WEBHOOK_SECRET`
- `CRON_SECRET`
- `PLAYWRIGHT_BASE_URL` (or pass `--app-url`)
- `E2E_STUDENT_ID`
- `E2E_TUTOR_ID`

Optional:

- `E2E_PRICE_CENTS` (default `10000`)
- `E2E_FAST_FORWARD_HOLD=true|false` (default `true`)

## Exact run sequence

1. Tutor completes Connect onboarding in test mode.
2. Run the script:

```powershell
npm run stripe:e2e:payout -- --app-url https://your-vercel-domain.com
```

3. Script checks, in order:

- Tutor has `stripe_payouts_enabled=true` and `stripe_account_id`.
- Creates availability at known price.
- Sends signed `checkout.session.completed` webhook.
- Confirms slot becomes `booked` and session exists.
- Moves session `end_time` to past.
- Calls `/api/cron/complete-sessions`.
- Confirms payout ledger exists with `pending`/`held` status.
- Fast-forwards `hold_until` to past (if enabled).
- Calls `/api/cron/process-payouts`.
- Confirms ledger becomes `transferred` with `transfer_id`.

4. Manual UI check:

- Open tutor dashboard payout section.
- Verify pending/available chips changed.
- Verify transaction row shows `Paid` status.

## Notes

- This script intentionally uses Stripe webhook signature validation and cron auth headers.
- If `CRON_REQUIRE_SIGNATURE=true`, the script automatically sends cron signature headers.
- Keep this in Stripe test mode only.
