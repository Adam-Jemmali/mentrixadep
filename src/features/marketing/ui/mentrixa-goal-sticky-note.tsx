"use client";

import { cn } from "@/shared/core/utils";
import {
  MENTRIXA_GOAL,
  MENTRIXA_GOAL_COMPACT,
  MENTRIXA_GOAL_LANDING,
  type MentrixaGoalBlock,
} from "@/features/marketing/mentrixa-goal-messages-pure";
import { mentrixHubSurfaces } from "@/features/student-profile/student-hub-surfaces";

type Variant = "student" | "landing" | "custom";
type Density = "full" | "compact";

export function MentrixaGoalStickyNote({
  variant = "student",
  density = "full",
  copy,
  className,
  rotate = true,
}: {
  variant?: Variant;
  density?: Density;
  copy?: MentrixaGoalBlock;
  className?: string;
  rotate?: boolean;
}) {
  const block =
    copy ??
    (variant === "landing"
      ? MENTRIXA_GOAL_LANDING
      : density === "compact"
        ? { ...MENTRIXA_GOAL, ...MENTRIXA_GOAL_COMPACT }
        : MENTRIXA_GOAL);

  const isLanding = variant === "landing";

  return (
    <aside
      className={cn(
        mentrixHubSurfaces.stickyNote,
        "mentrix-student-type-scope mx-surface-light mx-hub-paper relative text-[#0B1220]",
        rotate && "rotate-[-0.6deg]",
        isLanding && "shadow-[3px_5px_0_rgba(11,18,32,0.2),6px_14px_28px_-8px_rgba(0,0,0,0.45)]",
        className,
      )}
      aria-label="What Mentrixa is for"
    >
      <p className="mx-hub-type-ui text-[#6366F1]">Mentrixa goal</p>
      {density === "full" ? (
        <>
          <p className="mt-3 text-xl font-bold leading-snug text-[#0B1220]">
            <span className="text-[#6366F1]">Who: </span>
            {block.who}
          </p>
          <p className="mt-3 text-lg leading-relaxed text-[#334155]">
            <span className="font-bold text-[#4F46E5]">Why: </span>
            {block.why}
          </p>
          <p className="mt-3 text-lg leading-relaxed text-[#334155]">
            <span className="font-bold text-[#4F46E5]">Why now: </span>
            {block.whyNow}
          </p>
        </>
      ) : (
        <>
          <p className="mt-2 text-lg font-bold leading-snug text-[#0B1220]">{block.who}</p>
          <p className="mt-2 text-base leading-relaxed text-[#334155]">{block.whyNow}</p>
        </>
      )}
      <p className="mt-4 border-t border-[#C4B5FD]/80 pt-3 text-base font-semibold leading-relaxed text-[#0B1220]">
        {block.verdict}
      </p>
      <p className="mt-2 text-sm font-medium text-[#475569]">{block.nextAction}</p>
    </aside>
  );
}
