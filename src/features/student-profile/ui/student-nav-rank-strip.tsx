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
import { rankProofsCountLabel } from "@/features/xp/rank-proofs-labels";

type PwaRankContext = {
  totalXp?: number;
  streakDays?: number;
  rankTitle?: string;
  rankLevel?: number;
  rankSource?: "xp" | "verified_first_attempt";
  rankVerdict?: string;
  rankNextAction?: string;
  verifiedCount?: number;
};

/** Compact verified rank + streak in the navbar. */
export function StudentNavRankStrip() {
  const pathname = usePathname();
  const [ctx, setCtx] = useState<PwaRankContext>({});

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/student/pwa-context", { credentials: "include" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as PwaRankContext;
        if (!cancelled) setCtx(data);
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
      if (event.totalXp != null) {
        setCtx((prev) => ({ ...prev, totalXp: event.totalXp }));
      }
    });
  }, []);

  const totalXp = ctx.totalXp ?? 0;
  const accountRank = getAccountRankFromTotalXp(totalXp);
  const streak = ctx.streakDays ?? 0;
  const modeLabel = pathname.includes("/duel") || pathname.includes("/division")
    ? "Arena"
    : pathname.includes("/quest")
      ? "Workbench"
      : null;

  const title = normalizeRankTitle(accountRank.title);

  return (
    <Link
      href="/student"
      onClick={() => {
        unlockMentrixaAudioFromUserGesture();
        playMentrixaLoadingOnce();
      }}
      className={cn(
        "mx-hud-strip flex max-w-[14rem] items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3 transition hover:border-white/20 hover:bg-white/10 sm:max-w-xs",
      )}
      title={ctx.rankVerdict ?? "Your verified rank"}
    >
      <RankBadge rank={accountRank} size="sm" active showGlow={accountRank.key === "mentrixer"} />
      <div className="flex min-w-0 flex-col leading-tight">
        <span
          className="truncate text-[10px] font-bold uppercase tracking-wide"
          style={{ color: accountRank.labelOnDark }}
        >
          {title}
        </span>
        <span className="line-clamp-2 text-[9px] leading-snug text-white/75">
          {ctx.rankVerdict ?? rankProofsCountLabel(ctx.verifiedCount ?? 0)}
        </span>
        {streak > 0 ? (
          <span className="text-[9px] font-mono tabular-nums text-amber-200/90">{streak}d streak</span>
        ) : null}
      </div>
      {modeLabel ? (
        <span className="hidden rounded-full border border-white/10 bg-black/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-violet-200/90 lg:inline">
          {modeLabel}
        </span>
      ) : null}
    </Link>
  );
}
