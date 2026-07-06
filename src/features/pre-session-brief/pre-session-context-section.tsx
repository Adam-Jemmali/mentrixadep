"use client";

import { GuidePreSessionContextPanel } from "@/features/pre-session-brief/guide-context-panel";
import { GUIDE_PRE_SESSION } from "@/features/tutor/guide-home-copy-pure";

type UpcomingSession = {
  id: string;
  course: string;
  start_time: string;
  end_time: string;
  student_id?: string;
  student_profile?: {
    display_name: string | null;
    email: string | null;
  };
  student_email?: string | null;
};

export function PreSessionContextSection({
  guideId,
  upcomingSessions,
  displayTimeZone = "UTC",
}: {
  guideId: string;
  upcomingSessions: UpcomingSession[];
  displayTimeZone?: string;
}) {
  const upcoming = upcomingSessions.filter((s) => s.id && s.start_time);

  if (upcoming.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-1 text-sm font-bold text-slate-900">{GUIDE_PRE_SESSION.title}</h2>
      <p className="mb-4 text-xs text-slate-500">{GUIDE_PRE_SESSION.subtitle}</p>
      <div className="space-y-3">
        {upcoming.map((session) => {
          const name =
            session.student_profile?.display_name?.trim() ||
            session.student_profile?.email?.split("@")[0] ||
            session.student_email?.split("@")[0] ||
            "Student";
          return (
            <GuidePreSessionContextPanel
              key={session.id}
              sessionId={session.id}
              guideId={guideId}
              course={session.course}
              startTime={session.start_time}
              endTime={session.end_time}
              studentName={name}
              studentId={session.student_id}
              displayTimeZone={displayTimeZone}
            />
          );
        })}
      </div>
    </section>
  );
}
