import type { Metadata } from "next";
import { ProgressDashboardClient } from "./progress-dashboard-client";

export const metadata: Metadata = {
  title: "Progress Dashboard — Mentrixa",
  description: "Track your learning progress and share reports.",
};

export default function ProgressDashboardPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mx-surface-light rounded-2xl p-6 shadow-lg shadow-black/20 sm:p-8">
        <ProgressDashboardClient />
      </div>
    </div>
  );
}
