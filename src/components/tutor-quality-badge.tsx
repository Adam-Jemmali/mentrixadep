"use client";

import { useEffect, useState } from "react";
import { getTutorQualityScore } from "@/app/actions/tutor-quality";
import { getBadgeLabel, getBadgeColorClass, type TutorQualityScore } from "@/lib/tutor-quality";
import { cn } from "@/lib/utils";

export function TutorQualityBadge({ tutorId }: { tutorId: string }) {
  const [score, setScore] = useState<TutorQualityScore | null>(null);

  useEffect(() => {
    getTutorQualityScore(tutorId).then(setScore);
  }, [tutorId]);

  if (!score) return null;

  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
          getBadgeColorClass(score.badge)
        )}
      >
        {getBadgeLabel(score.badge)}
      </span>
      <div className="flex items-center gap-1.5">
        <div className="relative h-2 w-16 overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full",
              score.overall >= 80
                ? "bg-green-500"
                : score.overall >= 60
                  ? "bg-blue-500"
                  : "bg-amber-500"
            )}
            style={{ width: `${score.overall}%` }}
          />
        </div>
        <span className="text-xs font-medium tabular-nums text-slate-500">
          {score.overall}%
        </span>
      </div>
    </div>
  );
}
