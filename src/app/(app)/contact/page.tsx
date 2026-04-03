import type { Metadata } from "next";
import { ContactPageClient } from "@/components/contact/contact-page-client";
import { DEFAULT_PUBLIC_FEEDBACK_EMAIL } from "@/lib/mentrixa-brand";

export const metadata: Metadata = {
  title: "Contact & feedback · Mentrixa",
  description:
    "Reach the Mentrixa team — feedback, ideas, and support. We read every message from Mentrixers and Guides.",
};

export default function ContactPage() {
  const feedbackEmail =
    process.env.NEXT_PUBLIC_FEEDBACK_EMAIL?.trim() || DEFAULT_PUBLIC_FEEDBACK_EMAIL;
  return <ContactPageClient feedbackEmail={feedbackEmail} />;
}
