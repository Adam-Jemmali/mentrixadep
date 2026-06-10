export const runtime = "nodejs";
/** Vercel + Next — webhook runs DB + emails; allow headroom beyond default 10s cap. */
export const maxDuration = 60;
export { POST } from "@/features/payments/stripe-webhook";
