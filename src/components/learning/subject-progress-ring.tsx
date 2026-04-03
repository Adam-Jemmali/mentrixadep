"use client";

/**
 * SubjectProgressRing — circular progress indicator per subject.
 * Uses SVG stroke-dashoffset for the mastery arc.
 * Animates in on mount via GSAP.
 */

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import {
  masteryStatusColor,
  masteryStatusLabel,
  type MasteryStatus,
} from "@/lib/knowledge-graph";

const RING_RADIUS = 18;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const RING_COLOR: Record<MasteryStatus, string> = {
  locked: "#e2e8f0",
  learning: "#fbbf24",
  proficient: "#3b82f6",
  mastered: "#10b981",
};

interface SubjectProgressRingProps {
  subject: string;
  mastery: number;
  mastered: number;
  total: number;
  status: MasteryStatus;
  onClick?: () => void;
  active?: boolean;
}

export function SubjectProgressRing({
  subject,
  mastery,
  mastered,
  total,
  status,
  onClick,
  active = false,
}: SubjectProgressRingProps) {
  const arcRef = useRef<SVGCircleElement>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current || !arcRef.current) return;
    hasRun.current = true;
    const target = RING_CIRCUMFERENCE * (1 - mastery / 100);
    gsap.fromTo(
      arcRef.current,
      { strokeDashoffset: RING_CIRCUMFERENCE },
      {
        strokeDashoffset: target,
        duration: 0.8,
        ease: "power3.out",
        delay: 0.1,
      }
    );
  }, [mastery]);

  const dashOffset = RING_CIRCUMFERENCE * (1 - mastery / 100);

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-md p-2.5 text-left transition-all duration-150 ${
        active
          ? "bg-slate-100"
          : "hover:bg-slate-50"
      } ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      {/* Ring */}
      <div className="shrink-0">
        <svg width={44} height={44} viewBox="0 0 44 44" className="-rotate-90">
          {/* Track */}
          <circle
            cx={22}
            cy={22}
            r={RING_RADIUS}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={4}
          />
          {/* Progress arc */}
          <circle
            ref={arcRef}
            cx={22}
            cy={22}
            r={RING_RADIUS}
            fill="none"
            stroke={RING_COLOR[status]}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />
        </svg>
      </div>

      {/* Labels */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900 truncate leading-snug">{subject}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`text-xs ${masteryStatusColor(status)}`}>
            {masteryStatusLabel(status)}
          </span>
          <span className="text-slate-300 text-xs">·</span>
          <span className="text-xs text-slate-500 tabular-nums">
            {mastered}/{total} mastered
          </span>
        </div>
      </div>

      {/* Score */}
      <span className="shrink-0 text-sm font-medium tabular-nums text-slate-700">
        {mastery}%
      </span>
    </button>
  );
}
