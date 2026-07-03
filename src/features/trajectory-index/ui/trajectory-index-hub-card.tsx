"use client";

import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { VocabSectionHeading } from "@/shared/icons/mentrixa-vocab-icons";
import type { TrajectoryIndexResult } from "@/features/trajectory-index/trajectory-index-pure";

type TrajectoryIndexHubCardProps = {
  data: TrajectoryIndexResult;
};

export function TrajectoryIndexHubCard({ data }: TrajectoryIndexHubCardProps) {
  return (
    <section className={`${mentrixStudent.card} p-5 sm:p-6`} aria-label="Trajectory index">
      <VocabSectionHeading name="trajectory-certificate" label="Trajectory index" surface="light" gold />
      <p className="mt-2 text-3xl font-bold tabular-nums text-violet-700">{data.score}</p>
      <p className="mt-2 text-sm font-semibold text-zinc-900">{data.verdict}</p>
      <p className="mt-1 text-sm text-zinc-600">{data.nextAction}</p>

      <ul className="mt-4 grid gap-2 sm:grid-cols-3">
        <li className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
          Verified nodes · {data.verifiedComponent}
        </li>
        <li className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
          Retest closure · {data.retestComponent}
        </li>
        <li className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
          Loop delta · {data.loopComponent}
        </li>
      </ul>

      <div className="mt-4">
        <Button asChild size="sm" variant="outline">
          <Link href="/student/quest">Open daily quest</Link>
        </Button>
      </div>
    </section>
  );
}
