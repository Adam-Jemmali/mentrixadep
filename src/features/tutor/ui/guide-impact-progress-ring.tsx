"use client";

import { ProgressRing } from "@/components/ui";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { CANONICAL_IMPACT_SCORE_ICON } from "@/shared/icons/vocab-canonical";
import { guideImpactHeroTone } from "@/features/tutor/guide-home-pure";
import { cn } from "@/shared/core/utils";

export function GuideImpactProgressRing({
  score,
  size = 88,
  className,
  tone = "light",
}: {
  score: number;
  size?: number;
  className?: string;
  tone?: "light" | "dark";
}) {
  const impactTone = guideImpactHeroTone(score);
  const verified = impactTone === "gold";
  const isDark = tone === "dark";

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <ProgressRing
        value={score}
        max={100}
        size={size}
        verified={verified}
        label="Guide Impact Score"
        center={
          <span className="flex flex-col items-center gap-0.5">
            <MentrixaVocabIcon
              name={CANONICAL_IMPACT_SCORE_ICON}
              size={14}
              gold={verified}
              surface={tone}
              title="Guide Impact Score"
            />
            <span
              className={cn(
                "font-mono text-lg font-black tabular-nums leading-none",
                verified
                  ? "text-[var(--mx-gold)]"
                  : isDark
                    ? "text-violet-100"
                    : "text-[var(--mx-violet)]",
              )}
            >
              {score > 0 ? score : "—"}
            </span>
          </span>
        }
      />
    </div>
  );
}
