/**
 * Generate a VAPID key pair for Web Push (subscribe in the app; send via Edge Function / server).
 *
 * Usage: node scripts/generate-vapid-keys.mjs
 * Append the printed lines to .env.local (and set the same keys in Supabase Edge secrets for send-web-push).
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const webpush = require("web-push");

const keys = webpush.generateVAPIDKeys();

console.log("\n# Web Push (VAPID) — add to .env.local and redeploy:\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log("\n");
