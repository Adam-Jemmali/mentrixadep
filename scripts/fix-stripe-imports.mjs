#!/usr/bin/env node
/** Rewrite @/features/payments/stripe-connect imports to split modules. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(path.dirname(__dirname), "src");

const SYMBOL_MODULE = {
  resolveStoredStripeAccountId: "connect-onboarding",
  createAccountLink: "connect-onboarding",
  openStripeConnectOrDashboard: "connect-onboarding",
  refreshConnectStatus: "connect-onboarding",
  applyStripeAccountWebhookUpdate: "connect-onboarding",
  ConnectStatus: "connect-onboarding",
  PayoutLedgerRow: "payout-ledger",
  PayoutDashboardData: "payout-ledger",
  getPayoutDashboardData: "payout-ledger",
  triggerManualPayout: "payout-ledger",
  transferSessionPayout: "payout-ledger",
  retryPendingTransfersForTutor: "payout-ledger",
  createPayoutLedgerForSession: "payout-ledger",
  processQueuedPayouts: "payout-ledger",
};

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules") continue;
      walk(p, out);
    } else if (/\.(tsx?|jsx?|mjs)$/.test(ent.name)) {
      out.push(p);
    }
  }
  return out;
}

const importRe =
  /import\s+(type\s+)?\{([^}]+)\}\s+from\s+["']@\/features\/payments\/stripe-connect["'];?/g;

const dynamicImportRe =
  /import\s*\(\s*["']@\/features\/payments\/stripe-connect["']\s*\)/g;

let changed = 0;

for (const file of walk(ROOT)) {
  let text = fs.readFileSync(file, "utf8");
  if (!text.includes("@/features/payments/stripe-connect")) continue;

  let newText = text.replace(importRe, (full, typeKw, inner) => {
    const specs = inner
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const byModule = new Map();
    for (const spec of specs) {
      const m = spec.match(/^(type\s+)?(\w+)(?:\s+as\s+(\w+))?$/);
      if (!m) {
        console.warn(`Unparsed import in ${file}: ${spec}`);
        continue;
      }
      const name = m[3] ?? m[2];
      const mod = SYMBOL_MODULE[name];
      if (!mod) {
        console.warn(`Unknown stripe symbol in ${file}: ${name}`);
        continue;
      }
      if (!byModule.has(mod)) byModule.set(mod, []);
      byModule.get(mod).push(spec);
    }

    const lines = [];
    for (const [mod, syms] of byModule) {
      const allType = syms.every((s) => s.startsWith("type "));
      const prefix = typeKw || allType ? "import type" : "import";
      lines.push(`${prefix} { ${syms.join(", ")} } from "@/features/payments/${mod}";`);
    }
    return lines.join("\n");
  });

  newText = newText.replace(dynamicImportRe, (match) => {
    // command-center dynamic import of getPayoutDashboardData only
    if (text.includes("getPayoutDashboardData")) {
      return 'import("@/features/payments/payout-ledger")';
    }
    return match;
  });

  if (newText !== text) {
    fs.writeFileSync(file, newText);
    changed++;
  }
}

console.log(`Updated stripe imports in ${changed} files`);
