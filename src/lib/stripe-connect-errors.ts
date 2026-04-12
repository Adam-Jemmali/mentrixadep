import Stripe from "stripe";

/** Human-readable message for API routes / UI (Stripe errors include dashboard hints when helpful). */
export function formatStripeConnectError(err: unknown): string {
  if (err instanceof Stripe.errors.StripeError) {
    const msg = err.message.trim();
    const lower = msg.toLowerCase();
    if (
      lower.includes("losses") ||
      lower.includes("platform profile") ||
      (lower.includes("connect") && lower.includes("settings"))
    ) {
      return (
        `${msg} In Stripe (same mode as your API key: test vs live), open Settings → Connect → ` +
        `Platform profile and complete all required items, including loss liability / responsibilities for connected accounts.`
      );
    }
    return msg;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}
