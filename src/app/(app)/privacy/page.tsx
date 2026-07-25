"use client";

import { LegalStickyPageShell, type LegalStickySection } from "@/features/marketing/legal-ui/legal-sticky-page-shell";

const privacySections: LegalStickySection[] = [
  {
    title: "Information We Collect",
    content:
      "We collect account information (name, email, role), learning activity (sessions, quests, XP, progress), and operational data (device/browser metadata, logs, and security signals). Payment details are processed by Stripe and are not stored on Mentrixa servers.",
  },
  {
    title: "How We Use Information",
    content:
      "We use data to provide tutoring and learning features, secure the platform, support users, improve performance, and generate aggregated analytics for product quality and reliability.",
  },
  {
    title: "Children and Student Data",
    content:
      "Mentrixa requires age confirmation at signup. For student-related data, we apply least-privilege access, role-based controls, and deletion workflows. Recording uploads require explicit consent confirmation.",
  },
  {
    title: "Cookies and Analytics",
    content:
      "We use essential cookies for authentication and security. We may use limited product analytics to understand feature usage and reliability. Users in EEA/UK locales are shown a consent banner for analytics-related cookies.",
  },
  {
    title: "Data Sharing",
    content:
      "We share data only with service providers needed to run Mentrixa, such as infrastructure, authentication, email, payments, observability, and AI services. These providers are contractually restricted to service delivery and security obligations.",
  },
  {
    title: "Retention and Deletion",
    content:
      "We retain data only as long as needed for service delivery, legal obligations, and fraud prevention. Users can request deletion of their own data from account settings or by contacting support.",
  },
];

export default function PrivacyPage() {
  return (
    <LegalStickyPageShell
      pageEyebrow="Privacy"
      pageTitle="Privacy Policy"
      lastUpdated="April 2, 2026"
      sections={privacySections}
      contactBlurb="For privacy questions or deletion requests, email us at the address below."
    />
  );
}
