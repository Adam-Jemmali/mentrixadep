# Student Stripe + Tutor Payout Verification

## Current Model

- Stripe is used for student checkout only.
- Tutor payouts are handled via PayPal or bank transfer.

## Smoke Verification

1. Create a paid booking through Stripe Checkout.
2. Complete session and run complete-sessions cron.
3. Confirm tutor dashboard earnings update.
4. Confirm held amount appears before hold window ends.
5. Confirm available amount appears after hold window.

## Out of Scope

- Stripe Connect onboarding
- Stripe transfer-based tutor payouts
- Tutor Stripe account status checks
