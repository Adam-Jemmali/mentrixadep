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
  showNextAction?: boolean;
}) {
  const changedClass =
    tone === "dark"
      ? "text-base font-semibold leading-relaxed text-white sm:text-lg"
      : "text-base font-semibold leading-relaxed text-[#0B1220] sm:text-lg";
  const reasonClass =
    tone === "dark"
      ? "text-sm leading-relaxed text-slate-300"
      : "text-sm leading-relaxed text-[#475569]";
  const actionClass =
    tone === "dark"
      ? "inline-flex text-sm font-medium text-indigo-300 underline-offset-2 hover:text-indigo-200 hover:underline"
      : "inline-flex text-sm font-medium text-indigo-700 underline-offset-2 hover:text-indigo-900 hover:underline";

  if (verdict.rankDelta) {
    const srText = [verdict.changed, verdict.reason, verdict.nextAction.label]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={cn(className)}>
        <p className="sr-only">{srText}</p>
        {!showNextAction ? (
          <div className="mb-3 space-y-2">
            <p className={changedClass}>{verdict.changed}</p>
            {verdict.reason ? <p className={reasonClass}>{verdict.reason}</p> : null}
          </div>
        ) : null}
        <RankDeltaVerdictVisual
          meta={verdict.rankDelta}
          nextAction={verdict.nextAction}
          tone={tone}
          showNextAction={showNextAction}
        />
        {verdict.comparison ? (
          <p
            className={cn(
              "mt-3 text-xs leading-relaxed",
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
              ? "text-xs leading-relaxed text-slate-400"
              : "text-xs leading-relaxed text-slate-500"
          }
        >
          {verdict.comparison}
        </p>
      ) : null}
    </div>
  );
}
