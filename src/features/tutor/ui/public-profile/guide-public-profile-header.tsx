"use client";

import Image from "next/image";
import { Badge } from "@/shared/ui/hero-badge";
import { GuideRankBadge } from "@/features/guide-rank/components/guide-rank-badge";
import { TutorAvatar } from "@/app/(app)/student/session-components/tutor-avatar";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { CANONICAL_SKILLS_ICON } from "@/shared/icons/vocab-canonical";
import { GUIDE_PUBLIC_COPY } from "@/features/tutor/public-profile-pure";
import { GuideImpactProgressRing } from "@/features/tutor/ui/guide-impact-progress-ring";

export function GuidePublicProfileHeader({
  name,
  avatarUrl,
  emailPrefix,
  courses,
  guideRank,
  responseRatePercent,
  showUpRatePercent,
  avgImpactScore,
}: {
  name: string;
  avatarUrl: string | null;
  emailPrefix: string;
  courses: string[];
  guideRank?: string;
  responseRatePercent: number | null;
  showUpRatePercent: number | null;
  avgImpactScore?: number | null;
}) {
  return (
    <header className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div className="relative flex h-[60px] w-[60px] shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--mx-violet)]/60 bg-[var(--mx-surface-3)]">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="" width={60} height={60} className="h-full w-full object-cover" unoptimized />
            ) : (
              <TutorAvatar displayName={name} emailPrefix={emailPrefix} avatarUrl={null} size="lg" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <GuideRankBadge rankKey={guideRank ?? "practitioner"} size="sm" />
            </div>
            <h1 className="text-[22px] font-bold leading-tight text-white">{name}</h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {courses.map((course) => (
                <Badge
                  key={course}
                  variant="soft"
                  className="border border-[var(--mx-violet)]/70 bg-transparent text-[11px] font-semibold text-[#C4B5FD]"
                >
                  <span className="inline-flex items-center gap-1">
                    <MentrixaVocabIcon name={CANONICAL_SKILLS_ICON} size={12} surface="dark" title={course} />
                    {course}
                  </span>
                </Badge>
              ))}
            </div>
          </div>
        </div>
        {avgImpactScore != null && avgImpactScore > 0 ? (
          <GuideImpactProgressRing
            score={Math.round(avgImpactScore)}
            size={64}
            tone="dark"
            className="shrink-0"
          />
        ) : null}
      </div>
      <p className="text-xs leading-snug text-[#94A3B8]">
        {responseRatePercent != null ? (
          <span>{GUIDE_PUBLIC_COPY.responseRate(Math.round(responseRatePercent))}</span>
        ) : (
          <span>Response rate building</span>
        )}
        {". "}
        {showUpRatePercent != null ? (
          <span>{GUIDE_PUBLIC_COPY.showUpRate(Math.round(showUpRatePercent))}</span>
        ) : (
          <span>Show-up rate building</span>
        )}
      </p>
    </header>
  );
}
