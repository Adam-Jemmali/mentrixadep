import type { Metadata } from "next";
import { getTutorCommandCenterData } from "@/app/actions/tutor";
import { TutorCommandCenterClient } from "./tutor-command-center-client";
import { requireRole } from "@/lib/auth";
import { getLocalHour, greetingForHour, firstNameFromDisplayName } from "@/lib/student-dashboard-helpers";

export const metadata: Metadata = {
  title: "Guide center · Mentrixa",
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";

export default async function TutorPage() {
  const user = await requireRole(["tutor", "admin"]);
  const now = new Date();

  try {
    const data = await getTutorCommandCenterData();
    const timeZone = data.tutorTimezone || "UTC";
    const firstName = firstNameFromDisplayName(data.guideProfile.displayName, user.email || "");
    const hour = getLocalHour(now, timeZone);
    const greeting = greetingForHour(hour, firstName);

    return (
      <div className="min-h-screen bg-slate-50">
        <TutorCommandCenterClient data={data} greeting={greeting} firstName={firstName} />
      </div>
    );
  } catch (e) {
    console.error("[tutor/page] render failed:", e);
    return (
      <div className="min-h-screen bg-neutral-50 px-6 py-12">
        <div className="mx-auto max-w-xl rounded-md border border-slate-200 bg-white p-6">
          <h1 className="text-lg font-medium text-slate-900">Guide center unavailable</h1>
          <p className="mt-2 text-sm text-slate-600">
            We could not load your dashboard right now. Please refresh in a few seconds.
          </p>
        </div>
      </div>
    );
  }
}
