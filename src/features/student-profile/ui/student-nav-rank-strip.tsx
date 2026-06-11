"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/core/utils";
import { onXpAward } from "@/features/xp/xp-events";
import {
  playMentrixaLoadingOnce,
  unlockMentrixaAudioFromUserGesture,
} from "@/shared/integrations/mentrixa-sounds";
import { getAccountRankFromTotalXp, normalizeRankTitle } from "@/features/xp/rank-icons";
import { RankBadge } from "@/features/student-profile/ui/rank-badge";

/** Compact rank + XP + streak in the navbar (replaces the old floating HUD). */
export function StudentNavRankStrip() {
  const pathname = usePathname();
  const [totalXp, setTotalXp] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/student/pwa-context", { credentials: "include" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { totalXp?: number; streakDays?: number };
        if (!cancelled) {
          setTotalXp(data.totalXp ?? 0);
          setStreak(data.streakDays ?? 0);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return onXpAward((event) => {
      if (event.totalXp != null) setTotalXp(event.totalXp);
    });
  }, []);

  const rank = getAccountRankFromTotalXp(totalXp);
  const modeLabel = pathname.includes("/duel") || pathname.includes("/division") || pathname.includes("/clan")
    ? "Arena"
    : pathname.includes("/quest")
      ? "Workbench"
      : null;

  return (
    <Link
      href="/student"
      onClick={() => {
        unlockMentrixaAudioFromUserGesture();
        playMentrixaLoadingOnce();
      }}
      className={cn(
        "mx-hud-strip flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3 transition hover:border-white/20 hover:bg-white/10",
      )}
      title="Your account rank"
    >
      <RankBadge rank={rank} size="sm" active showGlow={rank.key === "mentrixer"} />
      <div className="flex min-w-0 flex-col leading-tight">
        <span
          className="truncate text-[10px] font-bold uppercase tracking-wide"
          style={{ color: rank.labelOnDark }}
        >
          {normalizeRankTitle(rank.title)}
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-mono text-white/80 tabular-nums">
          <span>{totalXp.toLocaleString()} XP</span>
          {streak > 0 ? (
            <>
              <span className="text-white/30">·</span>
              <span className="text-amber-200/90">{streak}d</span>
            </>
          ) : null}
        </span>
      </div>
      {modeLabel ? (
        <span className="hidden rounded-full border border-white/10 bg-black/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-violet-200/90 lg:inline">
          {modeLabel}
        </span>
      ) : null}
    </Link>
  );
}
