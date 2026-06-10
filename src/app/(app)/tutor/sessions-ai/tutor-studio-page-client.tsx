"use client";

import Link from "next/link";
import { TiltCard } from "@/shared/ui/tilt-card";
import { BackButton } from "@/shared/ui/back-button";
import { Typewriter } from "@/shared/ui/typewriter";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { TutorStudioClient } from "./tutor-studio-client";
import { AdminViewProvider } from "@/components/admin-view-context";
import { TutorStudioRealtimeRefresh } from "@/components/tutor-studio-realtime-refresh";
import type { TutorSessionWithPackage } from "@/features/studio-ai/studio-packages";

type Props = {
  sessions: TutorSessionWithPackage[];
  fetchError: string | null;
  tutorId?: string;
  viewerUserId: string;
  viewerRole: "tutor" | "admin";
  generatedCount: number;
  studioKey: string;
};

export function TutorStudioPageClient({
  sessions,
  fetchError,
  tutorId,
  viewerUserId,
  viewerRole,
  generatedCount,
  studioKey,
}: Props) {
  const refreshTutorId = viewerRole === "tutor" ? viewerUserId : tutorId;

  return (
    <div className={`${mentrixStudent.pageBg} min-h-0 md:min-h-[calc(100dvh-3.5rem)]`}>
      <div className="mb-4 px-4 pt-4 sm:px-6">
        <BackButton />
      </div>

      <TiltCard
        tiltLimit={2}
        className="mx-surface-light block rounded-none border-b border-violet-200 px-4 pt-5 shadow-[0_4px_24px_-12px_rgba(15,23,42,0.08)] sm:px-6"
      >
        <p className={mentrixStudent.sectionEyebrowOnLight}>Guide workspace</p>
        <h1 className={`mt-1 h-[28px] text-lg font-bold sm:text-xl ${mentrixStudent.textOnLight}`}>
          <Typewriter text="Studio" speed={70} waitTime={8000} />
        </h1>
        <p className={`mt-0.5 text-sm ${mentrixStudent.textMutedOnLight}`}>
          Quest packages for every session you teach.
        </p>
        <p className="mt-2 text-xs font-mono tabular-nums text-violet-700">
          {generatedCount} packages published
        </p>

        {tutorId ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              href={`/tutor/${tutorId}/dashboard`}
              className="text-xs text-violet-600 underline-offset-2 hover:text-violet-800 hover:underline"
            >
              Back to admin dashboard
            </Link>
            <span className="rounded-md border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-800">
              Admin viewing as Guide
            </span>
          </div>
        ) : null}
      </TiltCard>

      <div className="px-4 py-6 sm:px-6">
        {refreshTutorId ? <TutorStudioRealtimeRefresh tutorId={refreshTutorId} /> : null}

        {fetchError ? (
          <div className="rounded-2xl border border-red-200/80 bg-white px-4 py-3 text-sm text-red-700">
            {fetchError}
          </div>
        ) : tutorId ? (
          <AdminViewProvider userId={tutorId}>
            <TutorStudioClient key={studioKey} sessions={sessions} />
          </AdminViewProvider>
        ) : (
          <TutorStudioClient key={studioKey} sessions={sessions} />
        )}
      </div>
    </div>
  );
}
