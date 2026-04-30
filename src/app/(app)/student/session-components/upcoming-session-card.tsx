"use client";

import { TutorAvatar } from "./tutor-avatar";
import { JoinVideoCallButton } from "@/components/join-video-call-button";
import { CancelSessionButton } from "../cancel-session-button";
import { formatDateInZone, formatTimeInZone } from "@/lib/time-format";
import { Badge } from "@/components/ui/badge";
import type { StudentSessionTutorProfile } from "@/app/actions/student";

type Session = {
  id: string;
  course: string;
  start_time: string;
  end_time: string;
  status?: string;
  tutor: StudentSessionTutorProfile;
};

export function UpcomingSessionCard({ 
  session, 
  displayTimeZone = "UTC" 
}: { 
  session: Session;
  displayTimeZone?: string;
}) {
  const emailPrefix = session.tutor.email?.split("@")[0] ?? "Guide";
  const name = session.tutor.display_name?.trim() || emailPrefix;
  const st = (session.status ?? "scheduled").toLowerCase();

  return (
    <article
      data-session-id={session.id}
      className="session-card session-table-row flex flex-col gap-4 rounded-md border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <TutorAvatar
          displayName={session.tutor.display_name}
          emailPrefix={emailPrefix}
          avatarUrl={session.tutor.avatar_url}
        />
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900">{name}</p>
          <Badge variant="outline" className="mt-1 text-[10px] font-mono border-slate-300">
            {session.course}
          </Badge>
          <p className="mt-2 text-sm text-slate-600">
            {formatDateInZone(session.start_time, displayTimeZone)} · {formatTimeInZone(session.start_time, displayTimeZone)} – {formatTimeInZone(session.end_time, displayTimeZone)}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:items-end gap-2 shrink-0">
        <Badge
          variant="outline"
          className={
            st === "scheduled"
              ? "border-slate-200 bg-slate-50 text-slate-800"
              : "border-slate-200 bg-white text-slate-700"
          }
        >
          {st === "scheduled" ? "Scheduled" : session.status ?? "Scheduled"}
        </Badge>
        <div className="flex flex-wrap items-center gap-2">
          <JoinVideoCallButton
            sessionId={session.id}
            startTime={session.start_time}
            endTime={session.end_time}
          />
          <CancelSessionButton sessionId={session.id} startTime={session.start_time} />
        </div>
      </div>
    </article>
  );
}
