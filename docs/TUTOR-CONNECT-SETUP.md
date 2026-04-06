# Tutor Stripe Connect Setup: Complete Guide

## What is Stripe Connect?

Stripe Connect is a payment system that allows Mentrixa (the platform) to collect payments from students, then automatically transfer tutor earnings to their bank account.

**Simple flow:**

1. Student pays → money goes to Mentrixa platform account
2. Tutor connects bank → money automatically transfers after each session
3. Tutor sees earnings in their bank account (2 business days later)

---

## Step-by-Step: How to Connect Your Bank Account

### Step 1: Go to Tutor Payout Dashboard

- Log in as tutor
- Click the tutor menu (top right)
- Go to `/tutor` → scroll down to **Payouts** section
- You should see:
  ```
  ┌─────────────────────────────────────────┐
  │ Payouts                                 │
  │ Your earnings split · 85% to you,       │
  │ 15% platform fee                        │
  │                                         │
  │ ⚠️ Set up payments to receive earnings  │
  │ Connect your bank account via Stripe    │
  │ to receive 85% of each session fee.     │
  │                                         │
  │ [Setup payments] button                 │
  └─────────────────────────────────────────┘
  ```

### Step 2: Click "Setup payments" Button

- Click the **[Setup payments]** button (on the right)
- A **popup dialog** will appear with information about Stripe Connect
- The dialog may say: "You can only create new accounts if you've signed up for Connect, which you can do at https://dashboard.stripe.com/connect"
- Click **[OK]** to close the dialog
- You may need to complete account setup in Stripe dashboard first

### Step 3: Go to Stripe Dashboard

- Open the link from the popup: **https://dashboard.stripe.com/connect**
- Or use this direct link in a new tab
- Log in to your Stripe account (or create one if needed)

### Step 4: Complete Stripe Connect Setup Form

You'll see a form asking for:

**Personal Information:**

- Full name
- Email
- Phone number
- Date of birth
- SSN (last 4 digits)

**Business Information:**

- Business name: "My Tutoring" or your name
- Business type: "Sole proprietor" or your setup

**Bank Account Details:**

- Bank routing number (9 digits, find on your checks)
- Bank account number (8–17 digits)
- Account holder name (must match bank records)

**Address:**

- Street address
- City, state, zip

### Step 5: Submit and Verify

- Fill in all required fields
- Review the Stripe Service Agreement (it's required)
- Click **[Submit]** or **[Continue]**

### Step 6: Verification (May Take Minutes or Hours)

Stripe verifies your information. You may:

- Get instant approval (most common)
- Wait 24–48 hours for verification
- Receive email if more info is needed

### Step 7: Return to Mentrixa

Once approved on Stripe:

- Go back to Mentrixa `/tutor` dashboard
- Refresh the page
- You'll see a **green success banner:**
  ```
  ✓ Payment account connected.
  You'll receive funds after sessions complete.
  ```
- Status changes from "Set up payments" → "✓ Connected"

### Step 8: You're Done!

From now on:

- When a student books and pays for a session
- After the session completes
- 7-day hold passes (dispute window)
- Money automatically transfers to your bank
- You see it in your **payout dashboard** under "Available to withdraw"
- Click **[Transfer to bank]** anytime to move funds to your personal bank

---

## What Happens Behind the Scenes (Technical)

When you click **[Setup payments]**:

1. **Mentrixa backend** calls Stripe API:

   ```
   stripe.accounts.create({
     type: "express",
     country: "US",
     email: your_email,
     capabilities: { transfers: { requested: true } }
   })
   ```

   This creates a Stripe Express account linked to YOU.

2. **A popup dialog appears** with the Stripe Connect link or setup instructions.

3. **You go to Stripe Dashboard** (https://dashboard.stripe.com/connect) to complete setup.

4. **You fill out the form on Stripe.com** (not our servers—Stripe's servers).

5. **Stripe verifies your identity** against bank records and government databases.

6. **When approved**, Mentrixa automatically detects the approval:
   - Your account status is refreshed
   - `stripe_payouts_enabled` is set to `true`

7. **Mentrixa updates the dashboard** to show ✓ Connected status.

---

## Files That Control This Flow

| File                                                                                     | What It Does                                               |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [src/app/api/stripe/connect/create/route.ts](src/app/api/stripe/connect/create/route.ts) | Creates the Stripe account when you click "Setup payments" |
| [src/app/api/stripe/connect/return/route.ts](src/app/api/stripe/connect/return/route.ts) | Handles redirect from Stripe with approval status          |
| [src/app/actions/stripe-connect.ts](src/app/actions/stripe-connect.ts)                   | Updates your account with `stripe_payouts_enabled=true`    |
| [src/app/(app)/tutor/payout-dashboard.tsx](<src/app/(app)/tutor/payout-dashboard.tsx>)   | UI for "Setup payments" button and success banner          |

---

## Troubleshooting

### Problem: No popup appears when I click "Setup payments"

**Cause:** JavaScript isn't loading or network issue.  
**Fix:**

1. Refresh the page (F5)
2. Check browser console (F12 → Console tab) for errors
3. Try a different browser (Chrome, Safari, Firefox)
4. Try disabling ad blockers—they might block the popup

### Problem: I see a popup but don't see the Stripe link

**Expected:** The popup should contain a link to https://dashboard.stripe.com/connect or similar Stripe setup URL.  
**Fix:**

1. Copy the URL from the popup
2. Paste it in a new browser tab
3. Or go directly to: https://dashboard.stripe.com/connect

### Problem: I get an error on Stripe's form

**Cause:** Incorrect SSN, bank details, or business name mismatch.  
**Fix:**

1. Double-check SSN (last 4 digits should match government ID)
2. Verify bank routing + account number on your checks/bank app
3. Account holder name must match exactly what's on the bank account

### Problem: I completed the form but didn't get approved

**Cause:** Stripe needs more info or is still verifying.  
**Fix:**

1. Check your email for messages from Stripe
2. Wait 24–48 hours (Stripe's verification time)
3. Try the "Setup payments" flow again—Stripe may ask for additional docs

### Problem: I see "Payment account connected" but nothing changed

**Expected:** This is correct.  
Now you need to:

1. Have a student book a session with you
2. Student pays via Stripe card
3. Session completes (after end_time passes)
4. Wait 7 days (dispute window)
5. `process-payouts` cron creates transfer
6. Money appears in your "Available to withdraw" chip
7. Click [Transfer to bank] to move funds to your account

---

## Security Notes

🔒 **Stripe handles bank details, not Mentrixa:**

- Your SSN, routing number, account number go directly to Stripe.com
- Mentrixa only receives your approved account ID (`acct_...`).
- We never store your bank details in our database.

🔒 **Verification is required:**

- Stripe verifies you're a real person with a real bank account
- Happens instantly or within 24–48 hours
- Required by law to prevent fraud

🔒 **You can disconnect anytime:**

- If you need to change banks: re-run setup with new bank details
- Existing payouts continue as scheduled
- Future earnings will go to your new bank

---

## Questions?

**Ready to get paid?**

1. Log in to Mentrixa
2. Go to `/tutor` dashboard
3. Scroll to Payouts section
4. Click [Setup payments]
5. Complete Stripe form with your bank details
6. You're done! Earnings will flow automatically.

**Still stuck?**
Contact support with your tutor email address and we'll verify your Connect status.
