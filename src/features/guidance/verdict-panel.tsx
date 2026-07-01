import Link from "next/link";
import { cn } from "@/shared/core/utils";
import type { Verdict } from "@/features/guidance/verdict-engine-pure";

export function VerdictPanel({
  verdict,
  tone = "dark",
  className,
}: {
  verdict: Verdict;
  tone?: "dark" | "light";
  className?: string;
}) {
  const changedClass =
    tone === "dark"
      ? "text-base font-semibold leading-relaxed text-white sm:text-lg"
      : "text-base font-semibold leading-relaxed text-slate-900 sm:text-lg";
  const reasonClass =
    tone === "dark"
      ? "text-sm leading-relaxed text-slate-300"
      : "text-sm leading-relaxed text-slate-600";
  const actionClass =
    tone === "dark"
      ? "inline-flex text-sm font-medium text-indigo-300 underline-offset-2 hover:text-indigo-200 hover:underline"
      : "inline-flex text-sm font-medium text-indigo-700 underline-offset-2 hover:text-indigo-900 hover:underline";

  return (
    <div className={cn("space-y-3", className)}>
      <p className={changedClass}>{verdict.changed}</p>
      <p className={reasonClass}>{verdict.reason}</p>
      <Link href={verdict.nextAction.href} className={actionClass}>
        {verdict.nextAction.label}
      </Link>
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
