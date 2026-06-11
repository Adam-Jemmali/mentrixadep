"use client";

/**
 * App shell client boundary (nav, consent, student overlays). Marketing landing lives in
 * `home-page-client.tsx` so this module stays smaller and dev does not multiplex two
 * heavy client trees through one webpack chunk graph.
 */

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import { createClient } from "@/shared/integrations/supabase/client";
import { flushXpQueue } from "@/features/xp/pwa-xp-queue";
import { trackClientEvent } from "@/shared/integrations/use-track";
import type { RankLevelUpPayload } from "@/features/xp/components/rank-level-up-modal";

const RankLevelUpModal = dynamic(
  () =>
    import("@/features/xp/components/rank-level-up-modal").then((m) => ({
      default: m.RankLevelUpModal,
    })),
  { ssr: false, loading: () => null },
);
import { ensureMentrixaAudioUnlocked, warmMentrixaSoundAssets } from "@/shared/integrations/mentrixa-sounds";
import type { AuthUser } from "@/shared/core/auth";
import { cn } from "@/shared/core/utils";
import { StudentNavbar } from "@/components/student-navbar";
import { TutorNavbar } from "@/components/tutor-navbar";
import { UiPerformanceBootstrap } from "@/components/ui-performance-bootstrap";
import { NavigationProgress } from "@/components/navigation-progress";
import { ErrorBoundary } from "@/components/error-boundary";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

const Navigation = dynamic(
  () => import("@/components/navigation").then((m) => ({ default: m.Navigation })),
  { loading: () => null },
);
const FloatingXpAnimations = dynamic(
  () => import("@/features/xp/floating-xp-animations").then((m) => ({ default: m.FloatingXpAnimations })),
  { ssr: false, loading: () => null },
);
const StudentFirstLoginTour = dynamic(
  () => import("@/components/student-first-login-tour").then((m) => ({ default: m.StudentFirstLoginTour })),
  { ssr: false, loading: () => null },
);
const TutorFirstLoginTour = dynamic(
  () => import("@/components/tutor-first-login-tour").then((m) => ({ default: m.TutorFirstLoginTour })),
  { ssr: false, loading: () => null },
);
const FeedbackWidget = dynamic(
  () => import("@/features/marketing/feedback-widget").then((m) => ({ default: m.FeedbackWidget })),
  { ssr: false, loading: () => null },
);
const CookieConsentBanner = dynamic(
  () => import("@/components/cookie-consent-banner").then((m) => ({ default: m.CookieConsentBanner })),
  { ssr: false, loading: () => null },
);
const ClickSoundProvider = dynamic(
  () => import("@/shared/ui/click-sound-provider").then((m) => ({ default: m.ClickSoundProvider })),
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

const XP_CACHE_KEY = "mentrixa-xp-cache";
const PUSH_DISMISS_KEY = "mentrixa-push-prompt-dismissed";
const PUSH_SUBSCRIBED_KEY = "mentrixa-push-subscribed";

/** ms timestamp; banner hidden until this time (after user dismisses). */
function streakRiskDismissedUntilKey(userId: string) {
  return `mentrixa-streak-risk-dismissed-until:${userId}`;
}

const STREAK_RISK_DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function useReferralFinalizeOnce() {
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void fetch("/api/referral/finalize", {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
  }, []);
}

function usePwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    /** Dev: `DevServiceWorkerGuard` in root layout unregisters SW — no PWA in development. */
    if (process.env.NODE_ENV === "development") return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch (e) {
        console.warn("[PWA] Service worker registration failed", e);
      }
    };
    void register();

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "MENTRIXA_FLUSH_XP_QUEUE") void flushXpQueue();
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    const onOnline = () => void flushXpQueue();
    window.addEventListener("online", onOnline);
    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/student/pwa-context", { credentials: "include" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { totalXp?: number; streakDays?: number };
        localStorage.setItem(
          XP_CACHE_KEY,
          JSON.stringify({ total: data.totalXp ?? 0, streak: data.streakDays ?? 0 }),
        );
      } catch {
        /* offline */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
}

function AppNavOrNothing({ user }: { user: AuthUser | null }) {
  const pathname = usePathname();
  if (pathname === "/") return null;
  if (pathname.startsWith("/video/")) return null;
  if (user?.role === "student" && user.approved) {
    return null;
  }
  if (user?.role === "tutor" && user.approved) {
    return null;
  }
  return <Navigation user={user} />;
}

type RankModalState = {
  payload: RankLevelUpPayload;
  headline?: string;
  subtitle?: string;
};

function LevelUpExperience({ user }: { user: AuthUser | null }) {
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

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    out[i] = raw.charCodeAt(i);
  }
  return out;
}

function PushNotificationOptIn() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (!pathname.startsWith("/student")) {
      setOpen(false);
      return;
    }
    if (localStorage.getItem(PUSH_DISMISS_KEY) === "1" || localStorage.getItem(PUSH_SUBSCRIBED_KEY) === "1") return;
    if (Notification.permission === "granted" || Notification.permission === "denied") return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/student/pwa-context", { credentials: "include" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { completedSessions?: number };
        if ((data.completedSessions ?? 0) >= 3) setOpen(true);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const subscribe = async () => {
    setError(null);
    setBusy(true);
    try {
      const vapidRes = await fetch("/api/push/vapid-public");
      const vapidJson = (await vapidRes.json()) as { configured?: boolean; publicKey?: string | null };
      if (!vapidJson.configured || !vapidJson.publicKey) {
        setError("Push is not configured yet. Ask your admin to add VAPID keys.");
        setBusy(false);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidJson.publicKey),
      });
      const body = sub.toJSON();
      if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
        setError("Could not read subscription keys.");
        setBusy(false);
        return;
      }
      const save = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          endpoint: body.endpoint,
          keys: { p256dh: body.keys.p256dh, auth: body.keys.auth },
        }),
      });
      if (!save.ok) {
        setError("Could not save subscription.");
        setBusy(false);
        return;
      }
      localStorage.setItem(PUSH_SUBSCRIBED_KEY, "1");
      setOpen(false);
    } catch (e) {
      const rawMessage = e instanceof Error ? e.message : "";
      if (/permission denied|denied/i.test(rawMessage)) {
        setError("Notification permission is blocked. Enable notifications in your browser site settings.");
      } else {
        setError(rawMessage || "Something went wrong.");
      }
    } finally {
      setBusy(false);
    }
  };

  const dismiss = () => {
    localStorage.setItem(PUSH_DISMISS_KEY, "1");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg text-blue-900 font-semibold">Enable notifications?</DialogTitle>
          <DialogDescription className="text-sm text-slate-600 leading-relaxed">
            Get session reminders, duel challenges, and level-up moments.
         
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
          <Button type="button" variant="outline" className="min-h-[44px]  text-white w-full sm:w-auto" onClick={dismiss}>
            Not now
          </Button>
          <Button type="button" className="min-h-[44px] w-full sm:w-auto" disabled={busy} onClick={() => void subscribe()}>
            {busy ? "Enabling…" : "Enable notifications"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PageFade({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-fade">
      {children}
    </div>
  );
}

function ShellEffects() {
  useReferralFinalizeOnce();
  usePwaRegister();
  return null;
}

/** Stale Turbopack chunks may still reference this export — keep a no-op so dev HMR never crashes. */
export function MentrixaAudioBootstrap() {
  return null;
}

export function RootLayoutClient({
  user,
  children,
}: {
  user: AuthUser | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    warmMentrixaSoundAssets();
    ensureMentrixaAudioUnlocked();
  }, []);
  const isHome = pathname === "/";
  const isApprovedStudent = user?.role === "student" && user.approved === true;
  const isApprovedTutor = user?.role === "tutor" && user.approved === true;
  const isVideoRoute = pathname.startsWith("/video/");
  const isStudentProfileRoute = /^\/student\/[^/]+\/?$/.test(pathname);
  const isTutorProfileRoute = /^\/tutor\/[^/]+\/?$/.test(pathname);
  const isProfileRoute = isStudentProfileRoute || isTutorProfileRoute;
  const isQuestOnboarding =
    isApprovedStudent && pathname === "/student/quest" && searchParams.get("onboarding") === "true";
  const isWorkbenchRoute =
    pathname.includes("/quest") ||
    pathname.includes("/sessions-ai");
  const isArenaRoute =
    pathname.includes("/duel") ||
    pathname.includes("/division");

  return (
    <ErrorBoundary>
      {!isVideoRoute ? <NavigationProgress /> : null}
      <UiPerformanceBootstrap />
      <ClickSoundProvider />
      <ShellEffects />
      <MentrixaAudioBootstrap />
      <AppNavOrNothing user={user} />
      {!isVideoRoute ? <FloatingXpAnimations /> : null}
      {isApprovedStudent && user && !isQuestOnboarding && !isVideoRoute ? (
        <StudentNavbar user={user} />
      ) : null}
      {isApprovedTutor && user && !isVideoRoute ? <TutorNavbar user={user} /> : null}
      {isApprovedStudent && user && !isQuestOnboarding ? <StudentFirstLoginTour user={user} /> : null}
      {isApprovedTutor && user ? <TutorFirstLoginTour user={user} /> : null}
      <LevelUpExperience user={user} />
      {isApprovedStudent && user ? (
        <PushNotificationOptIn />
      ) : null}
      {user && user.approved && !isVideoRoute ? <FeedbackWidget /> : null}
      {!isVideoRoute ? <CookieConsentBanner /> : null}
      <main
        suppressHydrationWarning
        className={cn(
          "relative min-h-screen",
          isVideoRoute && "min-h-0 h-[100dvh] overflow-hidden p-0 m-0 bg-black text-white",
          isHome && "bg-[#0B1120]",
          !isHome &&
            !isProfileRoute &&
            !isVideoRoute &&
            isWorkbenchRoute &&
            "mx-shell-workbench text-slate-100",
          !isHome &&
            !isProfileRoute &&
            !isVideoRoute &&
            isArenaRoute &&
            "mx-shell-arena text-slate-100",
          !isHome &&
            !isProfileRoute &&
            !isVideoRoute &&
            !isWorkbenchRoute &&
            !isArenaRoute &&
            "bg-mentrixa-app text-slate-100",
          isApprovedStudent &&
            !isQuestOnboarding &&
            !isVideoRoute &&
            "pt-[4.75rem] pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0",
          isApprovedTutor &&
            !isVideoRoute &&
            "pt-[4.75rem] pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0",
        )}
      >
        {/* Background: single `.bg-mentrixa-app` layer only — avoids stacked full-viewport textures, repeating images, and CSS animations (major paint/GPU cost). */}
        {isHome ? (
          <PageFade>{children}</PageFade>
        ) : (
          <div className="relative z-10 w-full">
            <PageFade>{children}</PageFade>
          </div>
        )}
      </main>
    </ErrorBoundary>
  );
}
