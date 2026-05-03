import Stripe from "stripe";
import { getStripeSecretKey } from "@/lib/env";

let stripeSingleton: Stripe | null = null;

/**
 * Shared Stripe SDK instance for server routes and Server Actions.
 *
 * The default Node `http`/`https` client can fail on some serverless hosts
 * (including certain Vercel / edge-adjacent paths) while the Web Fetch stack
 * works reliably. Stripe documents `createFetchHttpClient()` for this case;
 * it also behaves well on plain Node 18+.
 *
 * @see https://github.com/stripe/stripe-node/issues/2523
 */
export function getStripeServer(): Stripe {
  if (!stripeSingleton) {
    const secretKey = getStripeSecretKey();
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    stripeSingleton = new Stripe(secretKey, {
      httpClient: Stripe.createFetchHttpClient(),
    });
  }
  return stripeSingleton;
}
