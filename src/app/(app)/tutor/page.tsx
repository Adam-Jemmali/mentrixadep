import type { Metadata } from "next";
import { getTutorCommandCenterData } from "@/features/tutor/command-center";
import { GuideHomeClient } from "@/features/tutor/ui/guide-home-client";
import { requireRole } from "@/shared/core/auth";
import { getLocalHour, greetingForHour, firstNameFromDisplayName } from "@/features/student-profile/student-dashboard-helpers";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { cn } from "@/shared/core/utils";

export const metadata: Metadata = {
  title: "Guide. Mentrixa",
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
      <div className={cn(mentrixStudent.pageBgHub, "mentrix-student-type-scope")}>
        <GuideHomeClient data={data} greeting={greeting} firstName={firstName} />
      </div>
    );
  } catch (e) {
    console.error("[tutor/page] render failed:", e);
    return (
      <div className={mentrixStudent.pageBgHub}>
        <main className={mentrixStudent.main}>
          <div className={`${mentrixStudent.card} mx-auto max-w-xl p-6`}>
            <h1 className={`text-lg font-medium ${mentrixStudent.textOnLight}`}>Guide unavailable</h1>
            <p className={`mt-2 text-sm ${mentrixStudent.textMutedOnLight}`}>
              Refresh in a few seconds.
            </p>
          </div>
        </main>
      </div>
    );
  }
}
