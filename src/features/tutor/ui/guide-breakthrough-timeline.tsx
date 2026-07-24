"use client";

import type { GuideBreakthrough } from "@/features/guide-rank/reads";
import { Timeline, type TimelineItem } from "@/components/ui";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { CANONICAL_BREAKTHROUGH_ICON } from "@/shared/icons/vocab-canonical";
import { GUIDE_HOME } from "@/features/tutor/guide-home-copy-pure";

export function GuideBreakthroughTimeline({
  rows,
  tone = "light",
}: {
  rows: GuideBreakthrough[];
  tone?: "dark" | "light";
}) {
  if (rows.length === 0) {
    return <p className={tone === "dark" ? "text-sm text-[#94A3B8]" : "text-sm text-[#475569]"}>{GUIDE_HOME.breakthroughEmpty}</p>;
  }

  const items: TimelineItem[] = rows.map((row, index) => {
    const lift = row.postPercent - row.prePercent;
    const verifiedLift = lift >= 20;
    return {
      id: `${row.concept}-${index}`,
      verified: verifiedLift,
      icon: (
        <MentrixaVocabIcon
          name={CANONICAL_BREAKTHROUGH_ICON}
          size={14}
          gold={verifiedLift}
          surface={tone}
          title="Breakthrough"
        />
      ),
      title: row.concept,
      meta: `${row.prePercent}% → ${row.postPercent}%`,
      body: "First attempt accuracy after your session",
    };
  });

  return <Timeline items={items} tone={tone} />;
}
