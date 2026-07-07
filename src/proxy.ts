export { proxy } from "@/shared/core/proxy";

export const config = {
  matcher: [
    // Never run middleware on Stripe webhooks (raw body + signature verification).
    // Cron routes authenticate via CRON_SECRET in the route handler, not session cookies.
    // Also exclude Next internals, static assets.
    "/((?!api/stripe/webhook|api/cron/|_next/static|_next/image|favicon.ico|geo/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|ico|woff2?|txt|xml|webmanifest)$).*)",
  ],
};
