# Tutor Payment Flow

## Overview

Mentrixa uses a split model:

- Student payment: Stripe Checkout
- Tutor payout: PayPal or bank transfer (outside Stripe Connect)

## Flow

1. Student books and pays via Stripe Checkout.
2. Session is delivered.
3. Session is marked completed by cron.
4. Tutor net earnings are computed using platform fee rules.
5. Net earnings remain on a 7-day hold.
6. After hold, earnings are marked available for payout.
7. Finance sends payout using tutor-selected method.

## Dashboard Data

Tutor payout dashboard shows:

- Available to withdraw
- Pending hold
- Awaiting transfer
- Lifetime earned
- Transaction history from completed sessions

## Operational Notes

- Tutor Stripe Connect routes/actions are removed.
- Tutor payout data is calculated from completed sessions.
- Student Stripe checkout routes remain active.
