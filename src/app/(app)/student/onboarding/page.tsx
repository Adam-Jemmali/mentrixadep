import type { Metadata } from "next";
import { DiagnosticOnboardingClient } from "./diagnostic-onboarding-client";

export const metadata: Metadata = {
  title: "Diagnostic Onboarding — Mentrixa",
  description: "Answer a few questions and get a personalized study plan.",
};

export default function DiagnosticOnboardingPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mx-surface-light rounded-2xl p-6 shadow-lg shadow-black/20 sm:p-8">
        <DiagnosticOnboardingClient />
      </div>
    </div>
  );
}
