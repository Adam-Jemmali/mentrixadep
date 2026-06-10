#!/usr/bin/env node
/**
 * One-shot architecture migration: lib/ → shared/, actions/ → features/
 * Run: node scripts/migrate-architecture.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

/** @type {Record<string, string>} old import prefix → new */
const IMPORT_REWRITES = [
  // shared/core
  ["@/lib/auth", "@/shared/core/auth"],
  ["@/lib/env", "@/shared/core/env"],
  ["@/lib/security", "@/shared/core/security"],
  ["@/lib/security/captcha", "@/shared/core/security/captcha"],
  ["@/lib/security/auth-abuse", "@/shared/core/security/auth-abuse"],
  ["@/lib/redis", "@/shared/core/redis"],
  ["@/lib/cache", "@/shared/core/cache"],
  ["@/lib/user-meta-cache", "@/shared/core/user-meta-cache"],
  ["@/lib/utils", "@/shared/core/utils"],
  ["@/lib/time-format", "@/shared/core/time-format"],
  ["@/lib/timezones", "@/shared/core/timezones"],
  ["@/lib/flags", "@/shared/core/flags"],
  ["@/lib/zero-trust", "@/shared/core/zero-trust"],
  ["@/lib/cron", "@/shared/core/cron-auth"],
  ["@/lib/role-home", "@/shared/core/role-home"],
  ["@/lib/user-access-status", "@/shared/core/user-access-status"],
  ["@/lib/post-auth-destination", "@/shared/core/post-auth-destination"],
  ["@/lib/post-approval-redirect", "@/shared/core/post-approval-redirect"],
  ["@/lib/user-facing-error", "@/shared/core/user-facing-error"],
  ["@/lib/is-next-redirect-error", "@/shared/core/is-next-redirect-error"],
  ["@/lib/rsc-serialize", "@/shared/core/rsc-serialize"],
  ["@/lib/safe-router-refresh", "@/shared/core/safe-router-refresh"],
  ["@/lib/schemas", "@/shared/core/schemas"],
  ["@/lib/site", "@/shared/core/site"],
  ["@/lib/performance", "@/shared/core/performance"],
  ["@/lib/ui-performance", "@/shared/core/ui-performance"],
  ["@/lib/use-ui-perf-tier", "@/shared/core/use-ui-perf-tier"],
  ["@/lib/auth-user-lookup", "@/shared/core/auth-user-lookup"],
  ["@/lib/disposable-email", "@/shared/core/disposable-email"],
  ["@/lib/image-defaults", "@/shared/core/image-defaults"],
  ["@/lib/gsap", "@/shared/core/gsap"],
  // shared/integrations
  ["@/lib/supabase/client", "@/shared/integrations/supabase/client"],
  ["@/lib/supabase/server", "@/shared/integrations/supabase/server"],
  ["@/lib/supabase/admin", "@/shared/integrations/supabase/admin"],
  ["@/lib/stripe-server", "@/shared/integrations/stripe/server"],
  ["@/lib/stripe-session-booking", "@/shared/integrations/stripe/session-booking"],
  ["@/lib/stripe-booking-sync", "@/shared/integrations/stripe/booking-sync"],
  ["@/lib/stripe-checkout-copy", "@/shared/integrations/stripe/checkout-copy"],
  ["@/lib/stripe-connect-errors", "@/shared/integrations/stripe/connect-errors"],
  ["@/lib/email-identity", "@/shared/integrations/email/identity"],
  ["@/lib/email/session", "@/shared/integrations/email/session"],
  ["@/lib/email/marketing", "@/shared/integrations/email/marketing"],
  ["@/lib/email/templates", "@/shared/integrations/email/templates"],
  ["@/lib/email/shared", "@/shared/integrations/email/shared"],
  ["@/lib/email/index", "@/shared/integrations/email"],
  ["@/lib/email", "@/shared/integrations/email"],
  ["@/lib/ai/quest", "@/shared/integrations/ai/quest"],
  ["@/lib/ai/duel", "@/shared/integrations/ai/duel"],
  ["@/lib/ai/resolve", "@/shared/integrations/ai/resolve"],
  ["@/lib/ai/brief", "@/shared/integrations/ai/brief"],
  ["@/lib/ai/practice", "@/shared/integrations/ai/practice"],
  ["@/lib/ai/studio", "@/shared/integrations/ai/studio"],
  ["@/lib/ai/shared", "@/shared/integrations/ai/shared"],
  ["@/lib/ai/index", "@/shared/integrations/ai"],
  ["@/lib/ai", "@/shared/integrations/ai"],
  ["@/lib/observability", "@/shared/integrations/observability"],
  ["@/lib/analytics", "@/shared/integrations/analytics"],
  ["@/lib/use-track", "@/shared/integrations/use-track"],
  ["@/lib/resolve-ai", "@/shared/integrations/ai/resolve-runner"],
  ["@/lib/oauth-auth", "@/shared/integrations/oauth-auth"],
  ["@/lib/google-gsi-loader", "@/shared/integrations/google-gsi-loader"],
  ["@/lib/google-id-token", "@/shared/integrations/google-id-token"],
  ["@/lib/mentrixa-sounds", "@/shared/integrations/mentrixa-sounds"],
  // shared/types
  ["@/lib/database.types", "@/shared/types/database"],
  // features - jobs
  ["@/lib/jobs/handlers/index", "@/features/jobs/handlers"],
  ["@/lib/jobs/handlers/email", "@/features/jobs/handlers/email"],
  ["@/lib/jobs/handlers/analytics", "@/features/jobs/handlers/analytics"],
  ["@/lib/jobs/handlers/brief", "@/features/jobs/handlers/brief"],
  ["@/lib/jobs/handlers/payout", "@/features/jobs/handlers/payout"],
  ["@/lib/jobs/handlers/studio-package", "@/features/jobs/handlers/studio-package"],
  ["@/lib/jobs/handlers/transcription", "@/features/jobs/handlers/transcription"],
  ["@/lib/jobs/enqueue", "@/features/jobs/enqueue"],
  ["@/lib/jobs/claim", "@/features/jobs/claim"],
  ["@/lib/jobs/process", "@/features/jobs/process"],
  ["@/lib/jobs/queue-helpers", "@/features/jobs/queue-helpers"],
  ["@/lib/jobs/types", "@/features/jobs/types"],
  // features - domain lib
  ["@/lib/booking-pricing", "@/features/booking/booking-pricing"],
  ["@/lib/availability-schemas", "@/features/booking/availability-schemas"],
  ["@/lib/availability-slot-builder", "@/features/booking/availability-slot-builder"],
  ["@/lib/refund-eligibility", "@/features/booking/refund-eligibility"],
  ["@/lib/calendar-ics", "@/features/booking/calendar-ics"],
  ["@/lib/teaching-defaults", "@/features/tutor/teaching-defaults"],
  ["@/lib/tutor-quality", "@/features/tutor/tutor-quality-lib"],
  ["@/lib/webrtc", "@/features/video/webrtc"],
  ["@/lib/recordings/save-session-recording-from-formdata", "@/features/video/save-session-recording"],
  ["@/lib/studio-package", "@/features/studio-ai/studio-package-lib"],
  ["@/lib/practice-quest-types", "@/features/quest/practice-quest-types"],
  ["@/lib/practice-fallback-questions", "@/features/quest/practice-fallback-questions"],
  ["@/lib/guest-try-types", "@/features/quest/guest-try-types"],
  ["@/lib/guest-mixed-fallback", "@/features/quest/guest-mixed-fallback"],
  ["@/lib/diagnostic-onboarding-plan", "@/features/quest/diagnostic-onboarding-plan"],
  ["@/lib/division-ui", "@/features/divisions/division-ui"],
  ["@/lib/division-focus-icons", "@/features/divisions/division-focus-icons"],
  ["@/lib/arena-division-focus", "@/features/divisions/arena-division-focus"],
  ["@/lib/division-week", "@/features/divisions/division-week"],
  ["@/lib/xp-constants", "@/features/xp/xp-constants"],
  ["@/lib/xp-events", "@/features/xp/xp-events"],
  ["@/lib/levels", "@/features/xp/levels"],
  ["@/lib/mentrixa-ranks", "@/features/xp/mentrixa-ranks"],
  ["@/lib/rank-icons", "@/features/xp/rank-icons"],
  ["@/lib/pwa-xp-queue", "@/features/xp/pwa-xp-queue"],
  ["@/lib/duel-reward", "@/features/duels/duel-reward"],
  ["@/lib/duel-constants", "@/features/duels/duel-constants"],
  ["@/lib/duel-fallback-questions", "@/features/duels/duel-fallback-questions"],
  ["@/lib/duel-audio-controller", "@/features/duels/duel-audio-controller"],
  ["@/lib/clan-constants", "@/features/clans/clan-constants"],
  ["@/lib/clan-light-form-ui", "@/features/clans/clan-light-form-ui"],
  ["@/lib/knowledge-graph", "@/features/learning-path/knowledge-graph-lib"],
  ["@/lib/embeddings", "@/features/learning-path/embeddings"],
  ["@/lib/stem-bucket", "@/features/learning-path/stem-bucket"],
  ["@/lib/student-profile", "@/features/student-profile/student-profile-lib"],
  ["@/lib/student-dashboard-helpers", "@/features/student-profile/student-dashboard-helpers"],
  ["@/lib/mentrix-student-ui", "@/features/student-profile/mentrix-student-ui"],
  ["@/lib/mentrix-tutor-ui", "@/features/tutor/mentrix-tutor-ui"],
  ["@/lib/confetti-burst", "@/features/xp/confetti-burst"],
  ["@/lib/referral-constants", "@/features/referrals/referral-constants"],
  ["@/lib/referral-monthly-cap", "@/features/referrals/referral-monthly-cap"],
  ["@/lib/institution-credits", "@/features/institutions/institution-credits"],
  ["@/lib/landing-stats", "@/features/marketing/landing-stats"],
  ["@/lib/landing-perf", "@/features/marketing/landing-perf"],
  ["@/lib/globe-land-data", "@/features/marketing/globe-land-data"],
  ["@/lib/brand-typewriter", "@/features/marketing/brand-typewriter"],
  ["@/lib/mentrixa-brand", "@/features/marketing/mentrixa-brand"],
  ["@/lib/waitlist-role", "@/features/registration/waitlist-role"],
  ["@/lib/waitlist-user-sync", "@/features/registration/waitlist-user-sync"],
  ["@/lib/registration-request-lookup", "@/features/registration/registration-request-lookup"],
  ["@/lib/registration-request-join", "@/features/registration/registration-request-join"],
  ["@/lib/delete-registration-requests-by-email", "@/features/registration/delete-registration-requests-by-email"],
  ["@/lib/onboarding-request-client", "@/features/registration/onboarding-request-client"],
  // actions → features (longer paths first)
  ["@/app/actions/stripe-connect", "@/features/payments/stripe-connect"],
  ["@/app/actions/student-profile", "@/features/student-profile/student-profile"],
  ["@/app/actions/student-progress", "@/features/learning-path/student-progress"],
  ["@/app/actions/student", "@/features/booking/student"],
  ["@/app/actions/session-ai-context", "@/features/studio-ai/session-ai-context"],
  ["@/app/actions/session-bundles", "@/features/video/session-bundles"],
  ["@/app/actions/pre-session-brief", "@/features/pre-session-brief/brief"],
  ["@/app/actions/practice-quest", "@/features/quest/practice-quest"],
  ["@/app/actions/knowledge-graph", "@/features/learning-path/knowledge-graph"],
  ["@/app/actions/diagnostic-onboarding", "@/features/quest/diagnostic-onboarding"],
  ["@/app/actions/division-weekly", "@/features/divisions/division-weekly"],
  ["@/app/actions/clan-dashboard", "@/features/clans/clan-dashboard"],
  ["@/app/actions/tutor-quality", "@/features/tutor/tutor-quality"],
  ["@/app/actions/autoPilot", "@/features/studio-ai/auto-pilot"],
  ["@/app/actions/reconciliation", "@/features/admin/reconciliation"],
  ["@/app/actions/verification", "@/features/verification/verification-queue"],
  ["@/app/actions/institution", "@/features/institutions/institution"],
  ["@/app/actions/cancellation", "@/features/booking/cancellation"],
  ["@/app/actions/top-rival", "@/features/divisions/top-rival"],
  ["@/app/actions/settings", "@/features/settings/user-settings"],
  ["@/app/actions/sessions", "@/features/booking/sessions"],
  ["@/app/actions/recordings", "@/features/video/recordings"],
  ["@/app/actions/compliance", "@/features/registration/compliance"],
  ["@/app/actions/contact", "@/features/marketing/contact"],
  ["@/app/actions/referral", "@/features/referrals/referrals"],
  ["@/app/actions/resolve", "@/features/resolve/resolve"],
  ["@/app/actions/divisions", "@/features/divisions/divisions"],
  ["@/app/actions/clan", "@/features/clans/clan-crud"],
  ["@/app/actions/quest", "@/features/quest/quest"],
  ["@/app/actions/duel", "@/features/duels/duel"],
  ["@/app/actions/video", "@/features/video/video"],
  ["@/app/actions/tutor", "@/features/tutor/tutor"],
  ["@/app/actions/admin", "@/features/admin/admin"],
  ["@/app/actions/auth", "@/features/auth/auth"],
  ["@/app/actions/xp", "@/features/xp/xp-awards"],
  // components/ui → shared/ui
  ["@/components/ui/", "@/shared/ui/"],
  // hooks
  ["@/hooks/", "@/shared/core/hooks/"],
];

/** @type {Array<[string, string]>} [fromRelativeToSrc, toRelativeToSrc] */
const FILE_MOVES = [
  // shared/core
  ["lib/auth.ts", "shared/core/auth.ts"],
  ["lib/env.ts", "shared/core/env.ts"],
  ["lib/security.ts", "shared/core/security.ts"],
  ["lib/redis.ts", "shared/core/redis.ts"],
  ["lib/cache.ts", "shared/core/cache.ts"],
  ["lib/user-meta-cache.ts", "shared/core/user-meta-cache.ts"],
  ["lib/utils.ts", "shared/core/utils.ts"],
  ["lib/time-format.ts", "shared/core/time-format.ts"],
  ["lib/timezones.ts", "shared/core/timezones.ts"],
  ["lib/flags.ts", "shared/core/flags.ts"],
  ["lib/zero-trust.ts", "shared/core/zero-trust.ts"],
  ["lib/cron.ts", "shared/core/cron-auth.ts"],
  ["lib/role-home.ts", "shared/core/role-home.ts"],
  ["lib/user-access-status.ts", "shared/core/user-access-status.ts"],
  ["lib/post-auth-destination.ts", "shared/core/post-auth-destination.ts"],
  ["lib/post-approval-redirect.ts", "shared/core/post-approval-redirect.ts"],
  ["lib/user-facing-error.ts", "shared/core/user-facing-error.ts"],
  ["lib/is-next-redirect-error.ts", "shared/core/is-next-redirect-error.ts"],
  ["lib/rsc-serialize.ts", "shared/core/rsc-serialize.ts"],
  ["lib/safe-router-refresh.ts", "shared/core/safe-router-refresh.ts"],
  ["lib/schemas.ts", "shared/core/schemas.ts"],
  ["lib/site.ts", "shared/core/site.ts"],
  ["lib/performance.ts", "shared/core/performance.ts"],
  ["lib/ui-performance.ts", "shared/core/ui-performance.ts"],
  ["lib/use-ui-perf-tier.ts", "shared/core/use-ui-perf-tier.ts"],
  ["lib/auth-user-lookup.ts", "shared/core/auth-user-lookup.ts"],
  ["lib/disposable-email.ts", "shared/core/disposable-email.ts"],
  ["lib/image-defaults.ts", "shared/core/image-defaults.ts"],
  ["lib/gsap.ts", "shared/core/gsap.ts"],
  ["proxy.ts", "shared/core/proxy.ts"],
  ["hooks/use-realtime-router-refresh.ts", "shared/core/hooks/use-realtime-router-refresh.ts"],
  // shared/integrations
  ["lib/stripe-server.ts", "shared/integrations/stripe/server.ts"],
  ["lib/stripe-session-booking.ts", "shared/integrations/stripe/session-booking.ts"],
  ["lib/stripe-booking-sync.ts", "shared/integrations/stripe/booking-sync.ts"],
  ["lib/stripe-checkout-copy.ts", "shared/integrations/stripe/checkout-copy.ts"],
  ["lib/stripe-connect-errors.ts", "shared/integrations/stripe/connect-errors.ts"],
  ["lib/email-identity.ts", "shared/integrations/email/identity.ts"],
  ["lib/resolve-ai.ts", "shared/integrations/ai/resolve-runner.ts"],
  ["lib/observability.ts", "shared/integrations/observability.ts"],
  ["lib/analytics.ts", "shared/integrations/analytics.ts"],
  ["lib/use-track.ts", "shared/integrations/use-track.ts"],
  ["lib/oauth-auth.ts", "shared/integrations/oauth-auth.ts"],
  ["lib/google-gsi-loader.ts", "shared/integrations/google-gsi-loader.ts"],
  ["lib/google-id-token.ts", "shared/integrations/google-id-token.ts"],
  ["lib/mentrixa-sounds.ts", "shared/integrations/mentrixa-sounds.ts"],
  // shared/types
  ["lib/database.types.ts", "shared/types/database.ts"],
  ["types/google-gsi.d.ts", "shared/types/google-gsi.d.ts"],
  // features/jobs — moved via moveDir("lib/jobs", ...)
  // features domain lib
  ["lib/booking-pricing.ts", "features/booking/booking-pricing.ts"],
  ["lib/availability-schemas.ts", "features/booking/availability-schemas.ts"],
  ["lib/availability-slot-builder.ts", "features/booking/availability-slot-builder.ts"],
  ["lib/refund-eligibility.ts", "features/booking/refund-eligibility.ts"],
  ["lib/calendar-ics.ts", "features/booking/calendar-ics.ts"],
  ["lib/teaching-defaults.ts", "features/tutor/teaching-defaults.ts"],
  ["lib/tutor-quality.ts", "features/tutor/tutor-quality-lib.ts"],
  ["lib/mentrix-tutor-ui.ts", "features/tutor/mentrix-tutor-ui.ts"],
  ["lib/webrtc.ts", "features/video/webrtc.ts"],
  ["features/video/recordings/save-session-recording-from-formdata.ts", "features/video/save-session-recording.ts"],
  ["lib/studio-package.ts", "features/studio-ai/studio-package-lib.ts"],
  ["lib/practice-quest-types.ts", "features/quest/practice-quest-types.ts"],
  ["lib/practice-fallback-questions.ts", "features/quest/practice-fallback-questions.ts"],
  ["lib/guest-try-types.ts", "features/quest/guest-try-types.ts"],
  ["lib/guest-mixed-fallback.ts", "features/quest/guest-mixed-fallback.ts"],
  ["lib/diagnostic-onboarding-plan.ts", "features/quest/diagnostic-onboarding-plan.ts"],
  ["lib/division-ui.ts", "features/divisions/division-ui.ts"],
  ["lib/division-focus-icons.ts", "features/divisions/division-focus-icons.ts"],
  ["lib/arena-division-focus.ts", "features/divisions/arena-division-focus.ts"],
  ["lib/division-week.ts", "features/divisions/division-week.ts"],
  ["lib/xp-constants.ts", "features/xp/xp-constants.ts"],
  ["lib/xp-events.ts", "features/xp/xp-events.ts"],
  ["lib/levels.ts", "features/xp/levels.ts"],
  ["lib/mentrixa-ranks.ts", "features/xp/mentrixa-ranks.ts"],
  ["lib/rank-icons.ts", "features/xp/rank-icons.ts"],
  ["lib/pwa-xp-queue.ts", "features/xp/pwa-xp-queue.ts"],
  ["lib/confetti-burst.ts", "features/xp/confetti-burst.ts"],
  ["lib/duel-reward.ts", "features/duels/duel-reward.ts"],
  ["lib/duel-constants.ts", "features/duels/duel-constants.ts"],
  ["lib/duel-fallback-questions.ts", "features/duels/duel-fallback-questions.ts"],
  ["lib/duel-audio-controller.ts", "features/duels/duel-audio-controller.ts"],
  ["lib/clan-constants.ts", "features/clans/clan-constants.ts"],
  ["lib/clan-light-form-ui.ts", "features/clans/clan-light-form-ui.ts"],
  ["lib/knowledge-graph.ts", "features/learning-path/knowledge-graph-lib.ts"],
  ["lib/embeddings.ts", "features/learning-path/embeddings.ts"],
  ["lib/stem-bucket.ts", "features/learning-path/stem-bucket.ts"],
  ["lib/student-profile.ts", "features/student-profile/student-profile-lib.ts"],
  ["lib/student-dashboard-helpers.ts", "features/student-profile/student-dashboard-helpers.ts"],
  ["lib/mentrix-student-ui.ts", "features/student-profile/mentrix-student-ui.ts"],
  ["lib/referral-constants.ts", "features/referrals/referral-constants.ts"],
  ["lib/referral-monthly-cap.ts", "features/referrals/referral-monthly-cap.ts"],
  ["lib/institution-credits.ts", "features/institutions/institution-credits.ts"],
  ["lib/landing-stats.ts", "features/marketing/landing-stats.ts"],
  ["lib/landing-perf.ts", "features/marketing/landing-perf.ts"],
  ["lib/globe-land-data.ts", "features/marketing/globe-land-data.ts"],
  ["lib/brand-typewriter.ts", "features/marketing/brand-typewriter.ts"],
  ["lib/mentrixa-brand.ts", "features/marketing/mentrixa-brand.ts"],
  ["lib/waitlist-role.ts", "features/registration/waitlist-role.ts"],
  ["lib/waitlist-user-sync.ts", "features/registration/waitlist-user-sync.ts"],
  ["lib/registration-request-lookup.ts", "features/registration/registration-request-lookup.ts"],
  ["lib/registration-request-join.ts", "features/registration/registration-request-join.ts"],
  ["lib/delete-registration-requests-by-email.ts", "features/registration/delete-registration-requests-by-email.ts"],
  ["lib/onboarding-request-client.ts", "features/registration/onboarding-request-client.ts"],
  // actions
  ["app/actions/admin.ts", "features/admin/admin.ts"],
  ["app/actions/auth.ts", "features/auth/auth.ts"],
  ["app/actions/autoPilot.ts", "features/studio-ai/auto-pilot.ts"],
  ["app/actions/cancellation.ts", "features/booking/cancellation.ts"],
  ["app/actions/clan.ts", "features/clans/clan-crud.ts"],
  ["app/actions/clan-dashboard.ts", "features/clans/clan-dashboard.ts"],
  ["app/actions/compliance.ts", "features/registration/compliance.ts"],
  ["app/actions/contact.ts", "features/marketing/contact.ts"],
  ["app/actions/diagnostic-onboarding.ts", "features/quest/diagnostic-onboarding.ts"],
  ["app/actions/divisions.ts", "features/divisions/divisions.ts"],
  ["app/actions/division-weekly.ts", "features/divisions/division-weekly.ts"],
  ["app/actions/duel.ts", "features/duels/duel.ts"],
  ["app/actions/institution.ts", "features/institutions/institution.ts"],
  ["app/actions/knowledge-graph.ts", "features/learning-path/knowledge-graph.ts"],
  ["app/actions/practice-quest.ts", "features/quest/practice-quest.ts"],
  ["app/actions/pre-session-brief.ts", "features/pre-session-brief/brief.ts"],
  ["app/actions/quest.ts", "features/quest/quest.ts"],
  ["app/actions/reconciliation.ts", "features/admin/reconciliation.ts"],
  ["app/actions/recordings.ts", "features/video/recordings.ts"],
  ["app/actions/referral.ts", "features/referrals/referrals.ts"],
  ["app/actions/resolve.ts", "features/resolve/resolve.ts"],
  ["app/actions/session-ai-context.ts", "features/studio-ai/session-ai-context.ts"],
  ["app/actions/session-bundles.ts", "features/video/session-bundles.ts"],
  ["app/actions/sessions.ts", "features/booking/sessions.ts"],
  ["app/actions/settings.ts", "features/settings/user-settings.ts"],
  ["app/actions/stripe-connect.ts", "features/payments/stripe-connect.ts"],
  ["app/actions/student.ts", "features/booking/student.ts"],
  ["app/actions/student-profile.ts", "features/student-profile/student-profile.ts"],
  ["app/actions/student-progress.ts", "features/learning-path/student-progress.ts"],
  ["app/actions/top-rival.ts", "features/divisions/top-rival.ts"],
  ["app/actions/tutor.ts", "features/tutor/tutor.ts"],
  ["app/actions/tutor-quality.ts", "features/tutor/tutor-quality.ts"],
  ["app/actions/verification.ts", "features/verification/verification-queue.ts"],
  ["app/actions/video.ts", "features/video/video.ts"],
  ["app/actions/xp.ts", "features/xp/xp-awards.ts"],
  // data
  ["data/globe-land-110m.json", "features/marketing/data/globe-land-110m.json"],
];

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function moveFile(fromRel, toRel) {
  const from = path.join(SRC, fromRel);
  const to = path.join(SRC, toRel);
  if (!fs.existsSync(from)) {
    console.warn(`SKIP (missing): ${fromRel}`);
    return;
  }
  if (fs.existsSync(to)) {
    console.warn(`SKIP (exists): ${toRel}`);
    return;
  }
  ensureDir(to);
  fs.renameSync(from, to);
  console.log(`MOVED: ${fromRel} → ${toRel}`);
}

function walk(dir, cb) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".next") continue;
      walk(p, cb);
    } else if (/\.(ts|tsx|js|mjs|json|md)$/.test(ent.name)) {
      cb(p);
    }
  }
}

function rewriteImports(content) {
  let out = content;
  const sorted = [...IMPORT_REWRITES].sort((a, b) => b[0].length - a[0].length);
  for (const [oldPath, newPath] of sorted) {
    out = out.split(oldPath).join(newPath);
  }
  return out;
}

function moveDir(fromRel, toRel) {
  const from = path.join(SRC, fromRel);
  const to = path.join(SRC, toRel);
  if (!fs.existsSync(from)) {
    console.warn(`SKIP DIR (missing): ${fromRel}`);
    return;
  }
  if (fs.existsSync(to)) {
    console.warn(`SKIP DIR (dest exists): ${toRel}`);
    return;
  }
  ensureDir(path.dirname(to));
  fs.renameSync(from, to);
  console.log(`MOVED DIR: ${fromRel} → ${toRel}`);
}

function moveUiComponents() {
  const uiSrc = path.join(SRC, "components", "ui");
  const uiDst = path.join(SRC, "shared", "ui");
  if (!fs.existsSync(uiSrc)) return;
  fs.mkdirSync(uiDst, { recursive: true });
  for (const ent of fs.readdirSync(uiSrc, { withFileTypes: true })) {
    const from = path.join(uiSrc, ent.name);
    const to = path.join(uiDst, ent.name);
    if (!fs.existsSync(to)) {
      fs.renameSync(from, to);
      console.log(`MOVED: components/ui/${ent.name} → shared/ui/${ent.name}`);
    }
  }
}

// --- main ---
console.log("=== Architecture migration ===\n");

fs.mkdirSync(path.join(SRC, "shared", "core"), { recursive: true });
fs.mkdirSync(path.join(SRC, "shared", "integrations"), { recursive: true });
fs.mkdirSync(path.join(SRC, "shared", "ui"), { recursive: true });
fs.mkdirSync(path.join(SRC, "shared", "types"), { recursive: true });
const FEATURE_DIRS = [
  "admin", "auth", "booking", "clans", "divisions", "duels", "institutions",
  "jobs", "learning-path", "marketing", "notifications", "payments",
  "pre-session-brief", "quest", "referrals", "registration", "resolve",
  "settings", "student-profile", "studio-ai", "tutor", "verification", "video", "xp",
];
for (const d of FEATURE_DIRS) {
  fs.mkdirSync(path.join(SRC, "features", d), { recursive: true });
}

// 1. Move directories (before individual files that lived inside them)
moveDir("lib/email", "shared/integrations/email");
moveDir("lib/ai", "shared/integrations/ai");
moveDir("lib/supabase", "shared/integrations/supabase");
moveDir("lib/security", "shared/core/security");
moveDir("lib/jobs", "features/jobs");
moveDir("lib/vendor", "shared/integrations/vendor");

// 1b. Move individual files
for (const [from, to] of FILE_MOVES) {
  moveFile(from, to);
}

// Remove shim re-export files superseded by folder barrels
for (const shim of ["lib/email.ts", "lib/ai.ts"]) {
  const p = path.join(SRC, shim);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log(`DELETED shim: ${shim}`);
  }
}

moveUiComponents();

// 2. Rewrite imports in entire src + tests
const scanRoots = [SRC, path.join(ROOT, "tests"), path.join(ROOT, "e2e")];
let filesUpdated = 0;
for (const root of scanRoots) {
  if (!fs.existsSync(root)) continue;
  walk(root, (filePath) => {
    const raw = fs.readFileSync(filePath, "utf8");
    const next = rewriteImports(raw);
    if (next !== raw) {
      fs.writeFileSync(filePath, next, "utf8");
      filesUpdated++;
    }
  });
}

// 3. Root proxy re-export (Next.js 16 proxy convention)
const proxyShim = `export { proxy, config } from "@/shared/core/proxy";\n`;
const proxyRoot = path.join(SRC, "proxy.ts");
fs.writeFileSync(proxyRoot, proxyShim, "utf8");
console.log("WROTE: src/proxy.ts shim");

console.log(`\nImport rewrites: ${filesUpdated} files updated`);
console.log("Done. Run: npm run build && npm run test:ci");
