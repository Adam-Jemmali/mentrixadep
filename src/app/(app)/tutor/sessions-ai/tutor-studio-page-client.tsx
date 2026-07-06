"use client";

import Link from "next/link";
import { BackButton } from "@/shared/ui/back-button";
import { Typewriter } from "@/shared/ui/typewriter";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { TutorStudioClient } from "./tutor-studio-client";
import { AdminViewProvider } from "@/components/admin-view-context";
import { TutorStudioRealtimeRefresh } from "@/components/tutor-studio-realtime-refresh";
import type { TutorSessionWithPackage } from "@/features/studio-ai/studio-packages";
import { GuideStickyNote } from "@/features/tutor/ui/guide-sticky-note";
import { GUIDE_SECTION_STICKY_VARIANT } from "@/features/tutor/guide-sticky-variants";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";

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
    <div className={`${mentrixStudent.pageBgHub} mentrix-student-type-scope min-h-0 md:min-h-[calc(100dvh-3.5rem)]`}>
      <div className="mb-4 px-4 pt-4 sm:px-6">
        <BackButton />
      </div>

      <div className="px-4 sm:px-6">
        <GuideStickyNote variant={GUIDE_SECTION_STICKY_VARIANT.studio} className="mb-6">
          <div className="flex items-center gap-2">
            <MentrixaVocabIcon name="bento-guide-studio" size={18} surface="light" title="Studio" />
            <p className={mentrixStudent.sectionEyebrowOnLight}>Guide workspace</p>
          </div>
          <h1 className={`mt-2 h-[28px] text-lg font-bold sm:text-xl ${mentrixStudent.textOnLight}`}>
            <Typewriter text="Studio" speed={70} waitTime={8000} />
          </h1>
          <p className={`mt-2 max-w-xl text-sm leading-relaxed ${mentrixStudent.textMutedOnLight}`}>
            Turn live {AP_CALC_AB_SUBJECT} session transcripts into REVIEWD quest packages.
            Impact Score measures first-attempt movement after your sessions.
          </p>
          <p className="mt-2 text-xs font-mono tabular-nums text-[#6366F1]">
            {generatedCount} packages published
          </p>

          {tutorId ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                href={`/tutor/${tutorId}/dashboard`}
                className="text-xs font-semibold text-[#6366F1] underline-offset-2 hover:text-[#4F46E5] hover:underline"
              >
                Back to admin dashboard
              </Link>
              <span className="rounded-md border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-900">
                Admin viewing as Guide
              </span>
            </div>
          ) : null}
        </GuideStickyNote>
      </div>

      <div className="px-4 py-2 sm:px-6 sm:pb-6">
        {refreshTutorId ? <TutorStudioRealtimeRefresh tutorId={refreshTutorId} /> : null}

        {fetchError ? (
          <GuideStickyNote variant="dog-ear">
            <p className="text-sm font-semibold text-red-800">{fetchError}</p>
          </GuideStickyNote>
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
