import type { Metadata } from "next";
import { ReconciliationClient } from "./reconciliation-client";

export const metadata: Metadata = {
  title: "Reconciliation — Mentrixa Admin",
  description: "Checkout/webhook/booking pipeline health.",
};

export default function ReconciliationPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <ReconciliationClient />
    </div>
  );
}
