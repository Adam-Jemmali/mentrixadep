import Link from "next/link";
import { cn } from "@/shared/core/utils";
import type { Verdict } from "@/features/guidance/verdict-engine-pure";
import { RankDeltaVerdictVisual } from "@/features/guidance/ui/rank-delta-verdict-visual";

export function VerdictPanel({
  verdict,
  tone = "dark",
  className,
  showNextAction = true,
}: {
  verdict: Verdict;
  tone?: "dark" | "light";
  className?: string;
  /** Owner-only on public surfaces. Visitors see changed + reason only. */
  showNextAction?: boolean;
}) {
  const changedClass =
    tone === "dark"
      ? "text-base font-semibold leading-snug text-white sm:text-lg"
      : "text-base font-semibold leading-snug text-[#0B1220] sm:text-lg";
  const reasonClass =
    tone === "dark"
      ? "text-sm leading-snug text-slate-300"
      : "text-sm leading-snug text-[#475569]";
  const actionClass =
    tone === "dark"
      ? "inline-flex text-sm font-semibold text-indigo-300 underline-offset-2 hover:text-indigo-200 hover:underline"
      : "inline-flex rounded-md bg-[#7C3AED] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#6D28D9]";

  if (verdict.rankDelta) {
    return (
      <div className={cn("space-y-3", className)}>
        <p className={changedClass}>{verdict.changed}</p>
        {verdict.reason ? <p className={reasonClass}>{verdict.reason}</p> : null}
        <RankDeltaVerdictVisual
          meta={verdict.rankDelta}
          nextAction={verdict.nextAction}
          tone={tone}
          showNextAction={showNextAction}
        />
        {verdict.comparison ? (
          <p
            className={cn(
              "text-xs leading-snug",
              tone === "dark" ? "text-slate-400" : "text-[#64748B]",
            )}
          >
            {verdict.comparison}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <p className={changedClass}>{verdict.changed}</p>
      {verdict.reason ? <p className={reasonClass}>{verdict.reason}</p> : null}
      {showNextAction ? (
        <Link href={verdict.nextAction.href} className={actionClass}>
          {verdict.nextAction.label}
        </Link>
      ) : null}
      {verdict.comparison ? (
        <p
          className={
            tone === "dark"
              ? "text-xs leading-snug text-slate-400"
              : "text-xs leading-snug text-[#64748B]"
          }
        >
          {verdict.comparison}
        </p>
      ) : null}
    </div>
  );
}
