import type { Metadata } from "next";
import { getSiteUrl } from "@/shared/core/site";

export const metadata: Metadata = {
  title: "Request received · Mentrixa",
  description: "Your Mentrixa onboarding request has been received.",
  alternates: { canonical: `${getSiteUrl()}/auth/request-received` },
  robots: { index: false, follow: false },
};

export default function RequestReceivedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
