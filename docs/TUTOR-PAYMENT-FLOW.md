# Tutor Payment Flow Architecture

## Overview: Multi-Stage Settlement

**Important:** "Tutor receives money" is a multi-stage process. Money doesn't appear instantly; it flows through several gates.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Student Payment                                                             │
│  ↓ (Stripe checkout)                                                        │
│  Student balance: Mentrixa platform account (NOT tutor yet)                 │
│  ↓ (session completes & cron/complete-sessions runs)                        │
│  Ledger row created: status=pending, hold_until=7d later                   │
│  ↓ (7 days pass & cron/process-payouts runs)                               │
│  Ledger row: status=transferred, transfer_id=tr_xxx                         │
│  Tutor balance: Stripe Connect account (available for withdrawal)           │
│  ↓ (tutor clicks "Transfer to bank" or payout cron fires)                   │
│  Tutor bank account: funds arrive in 2 business days                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Exact Flow with Code References

### Stage 1: Student Pays (Immediate)

- **Where:** [src/app/api/stripe/checkout/route.ts](src/app/api/stripe/checkout/route.ts)
- **What:** Student charged base session amount in Stripe.
- **Platform sees:** `checkout.session.completed` webhook.
- **Tutor sees:** Nothing yet. Money is on platform account.

### Stage 2: Slot Booked + Session Created (On Webhook)

- **Where:** [src/app/api/stripe/webhook/route.ts](src/app/api/stripe/webhook/route.ts) → `handleCheckoutCompleted()`
- **What:** Webhook marks slot as `booked`, creates `session_request`.
- **Tutor sees:** Session on calendar (no money yet).

### Stage 3: Session Completed + Ledger Created (On Cron)

- **Trigger:** [src/app/api/cron/complete-sessions/route.ts](src/app/api/cron/complete-sessions/route.ts)
- **Frequency:** Every 4–12 hours (Vercel cron).
- **When it runs:** Finds all sessions with `end_time <= now` and `status=scheduled`.
- **What it does:**
  - Marks session `status=completed`.
  - Calls [createPayoutLedgerForSession()](src/app/actions/stripe-connect.ts#L516-L555).
  - Creates `tutor_payout_ledger` row with:
    - `status=pending`
    - `hold_until=7 days from now`
    - `gross_cents`, `platform_fee_cents`, `net_cents` computed
- **Tutor sees:** Still nothing. Row is in pending hold.

### Stage 4: Hold Window Passes (7 Days)

- **Time gate:** Session completion time → 7 days later.
- **Ledger row:** Still `status=pending`, `hold_until` is in the past when cron checks it.

### Stage 5: Transfer Created (On Cron)

- **Trigger:** [src/app/api/cron/process-payouts/route.ts](src/app/api/cron/process-payouts/route.ts)
- **Frequency:** Every 4–12 hours.
- **When it runs:** Finds all ledger rows with `status=pending` AND `hold_until < now`.
- **What it does:**
  - Calls [transferSessionPayout()](src/app/actions/stripe-connect.ts#L425-L480) for each.
  - Creates Stripe `Transfer` from platform account → tutor's Connect account.
  - Updates ledger row to `status=transferred`, stores `transfer_id`.
- **Tutor sees:** Available balance increases in Connect account (queried by dashboard).

### Stage 6: Tutor Initiates Payout to Bank (Manual or Auto)

- **Where:** [src/app/(app)/tutor/payout-dashboard.tsx](<src/app/(app)/tutor/payout-dashboard.tsx#L174-L205>)
- **Action:** Tutor clicks "Transfer to bank" button OR auto-payout cron fires.
- **What it does:** Calls [triggerManualPayout()](src/app/actions/stripe-connect.ts#L386-L423).
- **Result:** `stripe.payouts.create()` API call from tutor's Connect account to their bank.
- **Status:** Bank transfer takes 1–2 business days.

---

## Troubleshooting: "Tutor Says I Got Paid Nothing"

Follow this exact checklist in order:

### 1. Is Tutor Connect Enabled?

```sql
SELECT id, email, stripe_account_id, stripe_payouts_enabled
FROM users
WHERE id = '<tutor_id>';
```

**Expected:** `stripe_account_id` is set (e.g., `acct_...`), `stripe_payouts_enabled = true`.  
**If false:** Tutor never finished or failed Connect onboarding. Direct them to payout dashboard.

### 2. Was Session Completed?

```sql
SELECT id, student_id, tutor_id, status, start_time, end_time, payout_status, created_at
FROM sessions
WHERE tutor_id = '<tutor_id>'
  AND status = 'completed'
ORDER BY start_time DESC
LIMIT 5;
```

**Expected:** Session has `status=completed`, `end_time` is in the past.  
**If status=scheduled:** Session was never marked complete. Check if complete-sessions cron ran.

### 3. Was Ledger Row Created?

```sql
SELECT id, session_id, tutor_id, status, hold_until, transfer_id, gross_cents, net_cents, created_at
FROM tutor_payout_ledger
WHERE tutor_id = '<tutor_id>'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected:** Row exists for session from step 2.  
**If missing:** Complete-sessions cron failed or never ran. Check cron logs.

### 4. Is Hold Window Past?

```sql
SELECT id, status, hold_until, transfer_id
FROM tutor_payout_ledger
WHERE tutor_id = '<tutor_id>'
  AND status IN ('pending', 'held')
ORDER BY hold_until ASC;
```

**Expected:** `hold_until` is in the past (< now).  
**If future:** Wait until that date, OR for testing: `UPDATE tutor_payout_ledger SET hold_until=now() WHERE id='...'`.

### 5. Did process-payouts Cron Run?

Check Vercel cron logs or manually call:

```bash
curl -X GET \
  'https://your-domain.com/api/cron/process-payouts' \
  -H 'Authorization: Bearer <CRON_SECRET>'
```

**Expected:** HTTP 200, job status=ok.  
**If failed:** Check cron logs, verify CRON_SECRET is correct.

### 6. Was Transfer Created?

```sql
SELECT id, status, transfer_id, transferred_at
FROM tutor_payout_ledger
WHERE tutor_id = '<tutor_id>'
ORDER BY transferred_at DESC
LIMIT 5;
```

**Expected:** `status=transferred`, `transfer_id` is set (e.g., `tr_...`).  
**If pending:** process-payouts cron hasn't run yet, or hold window hasn't passed. Go back to step 4.

### 7. Does Tutor Have Available Balance?

```bash
curl -X GET \
  'https://your-domain.com/api/stripe/connect/balance?tutor_id=<tutor_id>' \
  -H 'Authorization: Bearer <session_token>'
```

**Expected:** `available` balance > 0.  
**If zero:** Previous transfers haven't cleared. Wait 1–2 business days.

### 8. Did Tutor Click "Transfer to Bank"?

Check the UI at `/tutor` → Payouts section.  
**Expected:** Green "Transfer to bank" button, available balance displayed.  
**If button disabled:** Available balance is 0 (go back to step 7).

### 9. Check Payout Status in Stripe Dashboard

Go to Stripe Dashboard → Payouts (from Connect account):

- `succeeded`: Funds reached bank.
- `in_transit`: Payout is in-flight to bank.
- `failed`: Bank rejected; needs manual review.

---

## Platform Fee Split (Model A)

All stages use the same fee calculation:

```
Student pays:     $100.00 (base only)
Platform keeps:   $15.00 (15% from tutor share)
Tutor receives:   $85.00

Ledger row:
  gross_cents = 10000
  platform_fee_cents = 1500
  net_cents = 8500
```

**Key:** Platform fee is never charged to student; it's taken from tutor's share.  
**Source of truth:** [src/lib/booking-pricing.ts](src/lib/booking-pricing.ts) → `PLATFORM_FEE_BPS = 1500`

---

## Cron Requirements for Payment Flow

Both crons MUST run in production for money to flow:

1. **complete-sessions** → creates ledger rows
   - Must run before 7-day hold expires
   - Runs every 4–12 hours (Vercel default)

2. **process-payouts** → creates transfers
   - Must run after 7-day hold passes
   - Runs every 4–12 hours (Vercel default)

Check in Vercel dashboard → Crons tab:

```
✓ /api/cron/complete-sessions
✓ /api/cron/process-payouts
```

If either is missing, add to [vercel.json](vercel.json).  
Verify with:

```bash
npm run cron:verify
```

---

## Testing Payment Flow in Dev/Staging

Use the automated E2E script:

```bash
npm run stripe:e2e:payout -- --app-url https://your-domain.com
```

This will:

1. Send a signed checkout webhook.
2. Create a session.
3. Trigger complete-sessions cron.
4. Fast-forward hold_until (test convenience).
5. Trigger process-payouts cron.
6. Assert ledger moved to `transferred`.
7. Print transfer ID for manual Stripe verification.

See [docs/STRIPE-PAYOUT-E2E.md](docs/STRIPE-PAYOUT-E2E.md) for setup.

---

## Key Files for Debugging

| File                                                                                       | Purpose                                           |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| [src/lib/booking-pricing.ts](src/lib/booking-pricing.ts)                                   | Fee constant source of truth                      |
| [src/app/actions/stripe-connect.ts](src/app/actions/stripe-connect.ts)                     | Ledger/transfer/payout logic                      |
| [src/app/api/cron/complete-sessions/route.ts](src/app/api/cron/complete-sessions/route.ts) | Ledger creation trigger                           |
| [src/app/api/cron/process-payouts/route.ts](src/app/api/cron/process-payouts/route.ts)     | Transfer creation trigger                         |
| [src/app/(app)/tutor/payout-dashboard.tsx](<src/app/(app)/tutor/payout-dashboard.tsx>)     | Tutor UI (available/pending/paid chips + history) |
| [src/app/api/stripe/webhook/route.ts](src/app/api/stripe/webhook/route.ts)                 | Student payment ingestion                         |
| [vercel.json](vercel.json)                                                                 | Cron schedule configuration                       |

---

## Common Issues & Solutions

| Symptom                                    | Cause                             | Fix                                                      |
| ------------------------------------------ | --------------------------------- | -------------------------------------------------------- |
| Tutor sees no ledger row after session end | complete-sessions cron didn't run | Check Vercel cron logs; verify CRON_SECRET is set        |
| Ledger stuck in `pending` after 7 days     | process-payouts cron didn't run   | Check Vercel cron logs; manually call endpoint if needed |
| Transfer shows `failed` in Stripe          | Bank details invalid              | Tutor re-runs Connect onboarding                         |
| Available balance is 0                     | Transfer not yet cleared to bank  | Wait 1–2 business days                                   |
| "Transfer to bank" button grayed out       | No available balance              | Check if transfer succeeded in step 6                    |

---

## Unit Tests Guarding Against Drift

- [tests/unit/stripe.test.ts](tests/unit/stripe.test.ts) → Fee parity assertions (checkout vs payout use same %)
- [tests/unit/payout-ledger-creation.test.ts](tests/unit/payout-ledger-creation.test.ts) → Ledger function exists & called

Both fail CI if payment math diverges.
