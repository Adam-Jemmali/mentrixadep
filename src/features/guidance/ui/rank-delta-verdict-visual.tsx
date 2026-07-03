"use client";

import Link from "next/link";
import { cn } from "@/shared/core/utils";
import type { RankDeltaMeta, VerdictNextAction } from "@/features/guidance/verdict-engine-pure";
import { XpTierProgressBar } from "@/shared/ui/progress-bar-patterns";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <span className="rounded-md border border-[#C4B5FD] bg-[#EDE9FE] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#6366F1]">
        hold
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span
      className={cn(
        "rounded-md px-1.5 py-0.5 text-[10px] font-black tabular-nums",
        up ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800",
      )}
    >
      {up ? `+${delta}` : delta}
    </span>
  );
}

function MetricRow({
  icon,
  label,
  value,
  delta,
  tone,
}: {
  icon: "verified" | "rank-proof";
  label: string;
  value: number;
  delta: number;
  tone: "dark" | "light";
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const isDark = tone === "dark";

  return (
    <div className="min-w-0 flex-1 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5">
          <MentrixaVocabIcon
            name={icon}
            size={16}
            gold={icon === "verified"}
            surface={tone}
            title={label}
          />
          <span
            className={cn(
              "text-[9px] font-black uppercase tracking-[0.12em]",
              isDark ? "text-indigo-200/90" : "text-[#6366F1]",
            )}
          >
            {label}
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className={cn(
              "font-mono text-sm font-black tabular-nums",
              isDark ? "text-white" : "text-[#0B1220]",
            )}
          >
            {value}
            {icon === "verified" ? "%" : "th"}
          </span>
          <DeltaBadge delta={delta} />
        </span>
      </div>
      <XpTierProgressBar
        value={clamped}
        tone={tone}
        label={label}
        showHeader={false}
        fillStyle={{
          background: icon === "verified" ? "#7C3AED" : "#6366F1",
        }}
      />
    </div>
  );
}

function DriverChip({
  nodeName,
  isCorrect,
  tone,
}: {
  nodeName: string;
  isCorrect: boolean;
  tone: "dark" | "light";
}) {
  const short =
    nodeName.length > 22 ? `${nodeName.slice(0, 20).trim()}…` : nodeName;

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-1",
        isCorrect
          ? tone === "dark"
            ? "border-emerald-400/40 bg-emerald-950/40"
            : "border-emerald-300 bg-emerald-50"
          : tone === "dark"
            ? "border-amber-400/40 bg-amber-950/35"
            : "border-amber-300 bg-amber-50",
      )}
      title={nodeName}
    >
      <MentrixaVocabIcon
        name={isCorrect ? "verified" : "practice-pack"}
        size={12}
        gold={isCorrect}
        surface={tone}
        title={isCorrect ? "Verified" : "Missed"}
      />
      <span
        className={cn(
          "truncate text-[10px] font-semibold",
          tone === "dark" ? "text-violet-100" : "text-[#334155]",
        )}
      >
        {short}
      </span>
    </span>
  );
}

export function RankDeltaVerdictVisual({
  meta,
  nextAction,
  tone = "light",
  className,
}: {
  meta: RankDeltaMeta;
  nextAction: VerdictNextAction;
  tone?: "dark" | "light";
  className?: string;
}) {
  const showDrivers = meta.drivers.length > 0 && !meta.flat;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
        <MetricRow
          icon="verified"
          label="Accuracy"
          value={meta.accuracy.current}
          delta={meta.accuracy.delta}
          tone={tone}
        />
        {meta.percentile ? (
          <MetricRow
            icon="rank-proof"
            label="Percentile"
            value={meta.percentile.current}
            delta={meta.percentile.delta}
            tone={tone}
          />
        ) : null}
      </div>

      {showDrivers ? (
        <div className="flex flex-wrap gap-1.5" aria-label="Recent verified attempts">
          {meta.drivers.map((driver) => (
            <DriverChip
              key={`${driver.nodeName}-${driver.isCorrect}`}
              nodeName={driver.nodeName}
              isCorrect={driver.isCorrect}
              tone={tone}
            />
          ))}
        </div>
      ) : null}

      <Link
        href={nextAction.href}
        className={cn(
          tone === "dark" ? mentrixStudent.pillPrimary : mentrixStudent.hubBtnSolid,
          "inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.1em]",
        )}
      >
        <MentrixaVocabIcon name="quest" size={16} surface="dark" title="Quest" />
        {nextAction.label}
      </Link>
    </div>
  );
}
