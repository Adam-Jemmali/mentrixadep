import type { Metadata } from "next";
import { ContactPageClient } from "@/features/marketing/contact-ui/contact-page-client";
import { DEFAULT_PUBLIC_FEEDBACK_EMAIL } from "@/features/marketing/mentrixa-brand";
import { getSiteUrl } from "@/shared/core/site";

export const metadata: Metadata = {
  title: "Contact & feedback · Mentrixa",
  description:
    "Reach the Mentrixa team — feedback, ideas, and support. We read every message from Mentrixers and Guides.",
  alternates: {
    canonical: `${getSiteUrl()}/contact`,
  },
};

export default function ContactPage() {
  const feedbackEmail = DEFAULT_PUBLIC_FEEDBACK_EMAIL;
  return <ContactPageClient feedbackEmail={feedbackEmail} />;
}
