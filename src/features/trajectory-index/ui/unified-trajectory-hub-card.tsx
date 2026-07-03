"use client";

import { VocabSectionHeading } from "@/shared/icons/mentrixa-vocab-icons";
import type { UnifiedTrajectoryIndex } from "@/features/trajectory-index/cross-subject-trajectory-pure";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";

export function UnifiedTrajectoryHubCard({ data }: { data: UnifiedTrajectoryIndex }) {
  return (
    <section className={`${mentrixStudent.card} p-5 sm:p-6`} aria-label="Unified trajectory index">
      <VocabSectionHeading name="trajectory-certificate" label="Unified trajectory" surface="light" gold />
      <p className="mt-2 text-3xl font-black text-indigo-950">{data.score}</p>
      <p className="mt-2 text-sm font-semibold text-zinc-900">{data.verdict}</p>
      <p className="mt-1 text-sm text-zinc-600">{data.nextAction}</p>
    </section>
  );
}
