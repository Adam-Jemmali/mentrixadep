"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import { createClient } from "@/shared/integrations/supabase/client";
import { trackClientEvent } from "@/shared/integrations/use-track";
import type { AuthUser } from "@/shared/core/auth";
import type { RankLevelUpPayload } from "@/features/xp/components/rank-level-up-modal";

const RankLevelUpModal = dynamic(
  () =>
    import("@/features/xp/components/rank-level-up-modal").then((m) => ({
      default: m.RankLevelUpModal,
    })),
  { ssr: false, loading: () => null },
);

type RealtimeSubscribeStatus = "SUBSCRIBED" | "CHANNEL_ERROR" | "TIMED_OUT" | "CLOSED";

type UserAchievementsPayload = {
  new: {
    achievement_type?: string;
    to_level?: number | null;
    title?: string | null;
  };
};

type RankModalState = {
  payload: RankLevelUpPayload;
  headline?: string;
  subtitle?: string;
};

const STREAK_RISK_DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function streakRiskDismissedUntilKey(userId: string) {
  return `mentrixa-streak-risk-dismissed-until:${userId}`;
}

export function LevelUpExperience({ user }: { user: AuthUser | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [modalState, setModalState] = useState<RankModalState | null>(null);
  const [streakBanner, setStreakBanner] = useState<string | null>(null);
  const celebrationTriggeredRef = useRef(false);

  const uid = user?.id;
  const isStudent = user?.role === "student";
  const showStreak = Boolean(
    user && user.approved && isStudent && pathname.startsWith("/student"),
  );

  const refreshStreak = useCallback(async () => {
    if (!uid || !showStreak) return;
    try {
      const res = await fetch("/api/student/streak-ui", { credentials: "include" });
      if (!res.ok) {
        setStreakBanner(null);
        return;
      }
      const s = (await res.json()) as {
        streakDays: number;
        atRisk: boolean;
        hoursSinceAction: number | null;
      };
      if (s.atRisk && s.streakDays > 0) {
        if (typeof window !== "undefined") {
          const raw = localStorage.getItem(streakRiskDismissedUntilKey(uid));
          const until = raw ? Number(raw) : NaN;
          if (Number.isFinite(until) && Date.now() < until) {
            setStreakBanner(null);
            return;
          }
        }
        setStreakBanner("Streak risk. Keep going today.");
      } else {
        setStreakBanner(null);
      }
    } catch {
      setStreakBanner(null);
    }
  }, [uid, showStreak]);

  const dismissRankModal = useCallback(() => {
    setModalState(null);
    void refreshStreak();
  }, [refreshStreak]);

  useEffect(() => {
    void refreshStreak();
  }, [refreshStreak]);

  useEffect(() => {
    const wandererReveal =
      pathname === "/student" && searchParams.get("celebration") === "wanderer";
    if (!wandererReveal || celebrationTriggeredRef.current) return;

    celebrationTriggeredRef.current = true;
    setModalState({
      payload: { toLevel: 1, title: "WANDERER" },
      headline: "You are now a Mentrixer",
      subtitle: "Rank: WANDERER. Your first Quest is on the board.",
    });

    if (typeof window !== "undefined") {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete("celebration");
      window.history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}`);
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!uid || !user?.approved) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`achievements:${uid}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_achievements",
          filter: `user_id=eq.${uid}`,
        },
        (row: UserAchievementsPayload) => {
          const n = row.new as {
            achievement_type?: string;
            to_level?: number | null;
            title?: string | null;
          };
          const isRankUp =
            n.achievement_type === "rank_up" || n.achievement_type === "level_up";
          if (!isRankUp || n.to_level == null || !n.title) return;
          setModalState({
            payload: { toLevel: n.to_level, title: n.title },
          });
        },
      )
      .subscribe((status: RealtimeSubscribeStatus) => {
        if (status === "SUBSCRIBED") {
          trackClientEvent("realtime_reconnect", {
            channel: `achievements:${uid}`,
            reason: "subscribed",
          });
          return;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          trackClientEvent("realtime_disconnect", {
            channel: `achievements:${uid}`,
            reason: status.toLowerCase(),
          });
        }
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [uid, user?.approved]);

  const dismissStreakBanner = useCallback(() => {
    if (uid && typeof window !== "undefined") {
      localStorage.setItem(
        streakRiskDismissedUntilKey(uid),
        String(Date.now() + STREAK_RISK_DISMISS_COOLDOWN_MS),
      );
    }
    setStreakBanner(null);
  }, [uid]);

  if (!user || !isStudent || !user.approved) return null;

  if (pathname.startsWith("/video/")) return null;

  return (
    <>
      {streakBanner && showStreak ? (
        <div className="fixed bottom-4 left-1/2 z-40 flex max-w-lg -translate-x-1/2 items-start gap-2 rounded-md border border-amber-200 bg-amber-50 py-2.5 pl-4 pr-2 shadow-sm">
          <p className="min-w-0 flex-1 text-center text-xs leading-snug text-amber-950">{streakBanner}</p>
          <button
            type="button"
            onClick={dismissStreakBanner}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-amber-800 transition hover:bg-amber-100 hover:text-amber-950"
            aria-label="Dismiss streak reminder"
          >
            <span className="text-lg leading-none" aria-hidden>
              ×
            </span>
          </button>
        </div>
      ) : null}

      <RankLevelUpModal
        open={modalState != null}
        payload={modalState?.payload ?? null}
        headline={modalState?.headline}
        subtitle={modalState?.subtitle}
        onDismiss={dismissRankModal}
      />
    </>
  );
}
