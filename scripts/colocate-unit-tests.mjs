#!/usr/bin/env node
/** Colocate unit tests next to feature modules. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const MOVES = [
  ["tests/unit/booking-pricing.test.ts", "src/features/booking/booking-pricing.test.ts"],
  ["tests/unit/xp-awards.test.ts", "src/features/xp/xp-awards.test.ts"],
  ["tests/unit/levels.test.ts", "src/features/xp/levels.test.ts"],
  ["tests/unit/stripe-webhook-contract.test.ts", "src/features/payments/stripe-webhook.test.ts"],
  ["tests/unit/payout-ledger-creation.test.ts", "src/features/payments/payout-ledger-creation.test.ts"],
  ["tests/unit/stripe-connect-destination.test.ts", "src/features/payments/stripe-connect-destination.test.ts"],
  ["tests/unit/stripe.test.ts", "src/features/payments/stripe.test.ts"],
  ["tests/unit/duel-reward.test.ts", "src/features/duels/duel-reward.test.ts"],
  ["tests/unit/auth-abuse.test.ts", "src/shared/core/auth-abuse.test.ts"],
  ["tests/unit/security.test.ts", "src/shared/core/security.test.ts"],
  ["tests/unit/user-facing-error.test.ts", "src/shared/core/user-facing-error.test.ts"],
  ["tests/unit/vercel-crons.test.ts", "src/shared/core/vercel-crons.test.ts"],
];

for (const [from, to] of MOVES) {
  const src = path.join(ROOT, from);
  const dest = path.join(ROOT, to);
  if (!fs.existsSync(src)) {
    console.warn("skip missing", from);
    continue;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.renameSync(src, dest);
  console.log("moved", from, "→", to);
}

console.log("done");
