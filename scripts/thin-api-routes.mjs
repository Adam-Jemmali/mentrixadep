#!/usr/bin/env node
/** Move API route handler logic into feature modules; leave thin re-export shells. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

/** route path (posix) → feature module import path */
const MIGRATIONS = [
  ["src/app/api/auth/signin/route.ts", "@/features/auth/signin-api"],
  ["src/app/api/auth/signup/route.ts", "@/features/auth/signup-api"],
  ["src/app/api/auth/oauth-next/route.ts", "@/features/auth/oauth-next-api"],
  ["src/app/api/auth/request-password-reset/route.ts", "@/features/auth/password-reset-api"],
  ["src/app/api/stripe/checkout/route.ts", "@/features/payments/stripe-checkout"],
  ["src/app/api/stripe/checkout/success/route.ts", "@/features/payments/checkout-success"],
  ["src/app/api/stripe/checkout/cancel-return/route.ts", "@/features/payments/checkout-cancel-return"],
  ["src/app/api/stripe/connect/create/route.ts", "@/features/payments/connect-create-api"],
  ["src/app/api/stripe/connect/finalize/route.ts", "@/features/payments/connect-finalize-api"],
  ["src/app/api/stripe/connect/refresh/route.ts", "@/features/payments/connect-refresh-api"],
  ["src/app/api/stripe/connect/return/route.ts", "@/features/payments/connect-return-api"],
  ["src/app/api/tutor/studio-stream/route.ts", "@/features/studio-ai/studio-stream-api"],
  ["src/app/api/cron/test-session-automation/route.ts", "@/features/booking/test-session-automation-cron"],
  ["src/app/api/push/subscribe/route.ts", "@/features/notifications/push-subscribe-api"],
  ["src/app/api/push/vapid-public/route.ts", "@/features/notifications/push-vapid-api"],
  ["src/app/api/pwa/xp-sync/route.ts", "@/features/xp/pwa-xp-sync-api"],
  ["src/app/api/student/pwa-context/route.ts", "@/features/xp/pwa-context-api"],
  ["src/app/api/student/streak-ui/route.ts", "@/features/xp/streak-ui-api"],
  ["src/app/api/recordings/upload/route.ts", "@/features/video/recordings-upload-api"],
  ["src/app/api/referral/finalize/route.ts", "@/features/referrals/finalize-api"],
  ["src/app/api/stats/landing/route.ts", "@/features/marketing/landing-stats-api"],
  ["src/app/api/admin/config/route.ts", "@/features/admin/config-stub-api"],
];

function featureFilePath(importPath) {
  return path.join(ROOT, "src/features", importPath.replace("@/features/", "") + ".ts");
}

function detectExports(content) {
  const names = [];
  for (const m of content.matchAll(/^export async function (\w+)/gm)) names.push(m[1]);
  for (const m of content.matchAll(/^export function (\w+)/gm)) {
    if (!["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"].includes(m[1])) continue;
    if (!names.includes(m[1])) names.push(m[1]);
  }
  return [...new Set(names.filter((n) => ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"].includes(n)))];
}

function extractRouteConfig(content) {
  return content
    .split("\n")
    .filter((line) => /^export const (dynamic|runtime|maxDuration)\b/.test(line))
    .join("\n");
}

function isAlreadyThin(content, featureImport) {
  return content.includes(`from "${featureImport}"`) && content.split("\n").length <= 20;
}

let migrated = 0;
let skipped = 0;

for (const [routeRel, featureImport] of MIGRATIONS) {
  const routePath = path.join(ROOT, routeRel);
  const featurePath = featureFilePath(featureImport);

  if (!fs.existsSync(routePath)) {
    console.warn("skip missing route:", routeRel);
    skipped++;
    continue;
  }

  const content = fs.readFileSync(routePath, "utf8");
  if (isAlreadyThin(content, featureImport)) {
    console.log("already thin:", routeRel);
    skipped++;
    continue;
  }

  fs.mkdirSync(path.dirname(featurePath), { recursive: true });
  fs.writeFileSync(featurePath, content.endsWith("\n") ? content : content + "\n");

  const exports = detectExports(content);
  if (exports.length === 0) {
    console.error("no HTTP exports in", routeRel);
    process.exitCode = 1;
    continue;
  }

  const config = extractRouteConfig(content);
  const shell = [config, config ? "" : null, `export { ${exports.join(", ")} } from "${featureImport}";`, ""]
    .filter((x) => x !== null)
    .join("\n");

  fs.writeFileSync(routePath, shell);
  console.log("migrated:", routeRel, "→", path.relative(ROOT, featurePath));
  migrated++;
}

console.log(`\nDone: ${migrated} migrated, ${skipped} skipped`);
