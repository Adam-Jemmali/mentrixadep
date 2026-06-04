import type { Metadata } from "next";
import { getTutorCommandCenterData } from "@/app/actions/tutor";
import { TutorCommandCenterClient } from "./tutor-command-center-client";
import { requireRole } from "@/lib/auth";
import { getLocalHour, greetingForHour, firstNameFromDisplayName } from "@/lib/student-dashboard-helpers";
import { mentrixStudent } from "@/lib/mentrix-student-ui";

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
      <div className={mentrixStudent.pageBgHub}>
        <TutorCommandCenterClient data={data} greeting={greeting} firstName={firstName} />
      </div>
    );
  } catch (e) {
    console.error("[tutor/page] render failed:", e);
    return (
      <div className={mentrixStudent.pageBgHub}>
        <main className={mentrixStudent.main}>
          <div className={`${mentrixStudent.card} mx-auto max-w-xl p-6`}>
            <h1 className={`text-lg font-medium ${mentrixStudent.textOnLight}`}>Guide center unavailable</h1>
            <p className={`mt-2 text-sm ${mentrixStudent.textMutedOnLight}`}>
              We could not load your dashboard right now. Please refresh in a few seconds.
            </p>
          </div>
        </main>
      </div>
    );
  }
}
