"use client";

import { useMemo } from "react";
import Image from "next/image";
import { formatDate, formatTimeRange } from "@/lib/time-format";
import { DeletePastSessionButton } from "@/components/delete-past-session-button";
import { JoinVideoCallButton } from "@/components/join-video-call-button";
import { TutorSessionActions } from "./tutor-session-actions";
import { TutorPastAiGenerateButton } from "./tutor-past-ai-generate";

interface Session {
  id: string;
  course: string;
  start_time: string;
  end_time: string;
  completed: boolean;
  status?: string;
  student_id?: string;
  student?: {
    id: string;
  };
  student_email?: string | null;
  student_profile?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    email: string | null;
  };
  auto_approved?: boolean | null;
  rating?: number | null;
  /** True when an AI package row exists for this session (tutor dashboard / past tab). */
  hasAiPackage?: boolean;
}

interface SessionsListProps {
  upcomingSessions: Session[];
  pastSessions: Session[];
  mode?: "all" | "past-only";
}

export function SessionsList({
  upcomingSessions,
  pastSessions,
  mode = "all",
}: SessionsListProps) {
  const filteredUpcoming = useMemo(
    () => upcomingSessions.filter((s) => s.status !== "cancelled"),
    [upcomingSessions],
  );

  if (mode === "past-only") {
    return (
      <div className="mentrixa-table overflow-x-auto border border-slate-300 rounded-md bg-white shadow-sm">
        <table className="min-w-full text-xs">
          <thead className="border-b-2 border-slate-300 bg-slate-200 text-slate-900">
            <tr>
              <th className="py-2 px-3 text-left text-[11px] font-bold uppercase tracking-wide">
                Course
              </th>
              <th className="py-2 px-3 text-left text-[11px] font-bold uppercase tracking-wide">
                Learner
              </th>
              <th className="py-2 px-3 text-left text-[11px] font-bold uppercase tracking-wide">
                Date
              </th>
              <th className="py-2 px-3 text-left text-[11px] font-bold uppercase tracking-wide">
                Rating
              </th>
              <th className="py-2 px-3 text-left text-[11px] font-bold uppercase tracking-wide">
                AI Package
              </th>
            </tr>
          </thead>
          <tbody>
            {pastSessions.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="py-8 px-3 text-center text-xs text-slate-400"
                >
                  No past sessions.
                </td>
              </tr>
            ) : (
              pastSessions.map((session) => {
                const learnerEmail = session.student_profile?.email ?? session.student_email ?? null;
                const learnerName =
                  session.student_profile?.display_name?.trim() ||
                  learnerEmail?.split("@")[0] ||
                  (session.student_id ? `Student ${session.student_id.slice(0, 8)}` : "–");
                const learnerAvatar = session.student_profile?.avatar_url ?? null;
                return (
                <tr
                  key={session.id}
                  className="border-b border-slate-200 text-sm bg-white hover:bg-slate-100/90"
                >
                  <td className="py-2.5 px-3 align-middle">
                    <span className="font-mono text-xs font-medium text-slate-800">
                      {session.course}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 align-middle">
                    <div className="flex items-start gap-2">
                      <div className="relative h-7 w-7 overflow-hidden rounded-full border border-slate-200 bg-slate-100 shrink-0">
                        {learnerAvatar ? (
                          <Image
                            src={learnerAvatar}
                            alt={learnerName}
                            width={28}
                            height={28}
                            unoptimized
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-slate-600">
                            {learnerName.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-950">{learnerName}</p>
                        {learnerEmail ? <p className="truncate text-xs text-slate-500">{learnerEmail}</p> : null}
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 align-middle">
                    <span className="text-sm text-slate-900">{formatDate(session.start_time)}</span>
                  </td>
                  <td className="py-2.5 px-3 align-middle">
                    <span className="text-xs font-medium text-slate-800">
                      {session.rating != null ? `${session.rating} / 5` : "–"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 align-middle">
                    <TutorPastAiGenerateButton
                      sessionId={session.id}
                      hasAiPackage={session.hasAiPackage === true}
                    />
                  </td>
                  <td className="py-2.5 px-3 align-middle text-right">
                    <DeletePastSessionButton
                      sessionId={session.id}
                      endTime={session.end_time}
                      allowRemoveBeforeScheduledEnd={
                        session.status === "completed" ||
                        session.completed ||
                        session.status === "cancelled"
                      }
                    />
                  </td>
                </tr>
              );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="mentrixa-table overflow-x-auto border border-slate-300 rounded-md bg-white shadow-sm">
      <table className="min-w-full text-xs">
        <thead className="border-b-2 border-slate-300 bg-slate-200 text-slate-900">
          <tr>
            <th className="py-2 px-3 text-left text-[11px] font-bold uppercase tracking-wide">
              Course
            </th>
            <th className="py-2 px-3 text-left text-[11px] font-bold uppercase tracking-wide">
              Learner
            </th>
            <th className="py-2 px-3 text-left text-[11px] font-bold uppercase tracking-wide">
              Date
            </th>
            <th className="py-2 px-3 text-left text-[11px] font-bold uppercase tracking-wide">
              Time
            </th>
            <th className="py-2 px-3 text-left text-[11px] font-bold uppercase tracking-wide">
              Status
            </th>
            <th className="py-2 px-3 text-left text-[11px] font-bold uppercase tracking-wide">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredUpcoming.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="py-8 px-3 text-center text-xs text-slate-400"
              >
                No upcoming sessions.
              </td>
            </tr>
          ) : (
            filteredUpcoming.map((session) => {
              const status = session.auto_approved ? "Auto" : "Manual";
              const learnerEmail = session.student_profile?.email ?? session.student_email ?? null;
              const learnerName =
                session.student_profile?.display_name?.trim() ||
                learnerEmail?.split("@")[0] ||
                (session.student_id ? `Student ${session.student_id.slice(0, 8)}` : "–");
              const learnerAvatar = session.student_profile?.avatar_url ?? null;
              return (
                <tr
                  key={session.id}
                  className="border-b border-slate-200 text-sm bg-white hover:bg-slate-100/90"
                >
                  <td className="py-2.5 px-3 align-middle">
                    <span className="font-mono text-xs font-medium text-slate-800">
                      {session.course}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 align-middle">
                    <div className="flex items-start gap-2">
                      <div className="relative h-7 w-7 overflow-hidden rounded-full border border-slate-200 bg-slate-100 shrink-0">
                        {learnerAvatar ? (
                          <Image
                            src={learnerAvatar}
                            alt={learnerName}
                            width={28}
                            height={28}
                            unoptimized
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-slate-600">
                            {learnerName.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-950">{learnerName}</p>
                        {learnerEmail ? <p className="truncate text-xs text-slate-500">{learnerEmail}</p> : null}
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 align-middle">
                    <span className="text-sm text-slate-900">{formatDate(session.start_time)}</span>
                  </td>
                  <td className="py-2.5 px-3 align-middle">
                    <span className="text-sm font-mono tabular-nums text-slate-900">
                      {formatTimeRange(session.start_time, session.end_time)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 align-middle">
                    <span className="font-mono text-xs font-medium text-slate-800">{status}</span>
                  </td>
                  <td className="py-2.5 px-3 align-middle">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap sm:gap-3">
                      <JoinVideoCallButton
                        sessionId={session.id}
                        startTime={session.start_time}
                        endTime={session.end_time}
                      />
                      <TutorSessionActions sessionId={session.id} />
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

