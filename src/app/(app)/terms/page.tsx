"use client";

import { LegalStickyPageShell, type LegalStickySection } from "@/features/marketing/legal-ui/legal-sticky-page-shell";

const termsSections: LegalStickySection[] = [
  {
    title: "Use of Service",
    content:
      "Mentrixa provides learning and tutoring tools. You agree to use the platform lawfully, provide accurate account information, and keep your credentials secure.",
  },
  {
    title: "Roles and Access",
    content:
      "Access is role-based (student, tutor, admin). You may not attempt to bypass authorization controls, impersonate other users, or interfere with platform integrity.",
  },
  {
    title: "Payments and Billing",
    content:
      "Paid services are processed by Stripe. By purchasing, you authorize applicable charges. Refund eligibility is governed by Mentrixa policy and applicable law.",
  },
  {
    title: "Acceptable Use",
    content:
      "You must not upload malicious content, abuse AI tools, scrape protected data, or use the service for fraud, harassment, or other prohibited behavior. Violations may result in suspension or termination.",
  },
  {
    title: "Intellectual Property",
    content:
      "Mentrixa and its content are protected by intellectual property laws. You retain rights to your submissions while granting us rights necessary to operate and improve the service.",
  },
  {
    title: "Disclaimer and Liability",
    content:
      'The service is provided on an "as is" basis. To the maximum extent permitted by law, Mentrixa disclaims implied warranties and limits liability for indirect or consequential damages.',
  },
];

export default function TermsPage() {
  return (
    <LegalStickyPageShell
      pageEyebrow="Terms"
      pageTitle="Terms of Service"
      lastUpdated="April 2, 2026"
      sections={termsSections}
      contactBlurb="For legal notices and terms questions, email us at the address below."
    />
  );
}
