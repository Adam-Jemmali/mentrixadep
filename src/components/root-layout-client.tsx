"use client";

/**
 * App shell client boundary (nav, consent, student overlays). Marketing landing lives in
 * `home-page-client.tsx` so this module stays smaller and dev does not multiplex two
 * heavy client trees through one webpack chunk graph.
 */

import { type ReactNode, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import { flushXpQueue } from "@/features/xp/pwa-xp-queue";
import { ensureMentrixaAudioUnlocked, warmMentrixaSoundAssets } from "@/shared/integrations/mentrixa-sounds";
import type { AuthUser } from "@/shared/core/auth";
import { cn } from "@/shared/core/utils";
import { UiPerformanceBootstrap } from "@/components/ui-performance-bootstrap";
import { NavigationProgress } from "@/components/navigation-progress";
import { ErrorBoundary } from "@/components/error-boundary";

const StudentNavbar = dynamic(
  () => import("@/components/student-navbar").then((m) => ({ default: m.StudentNavbar })),
  { loading: () => null },
);
const TutorNavbar = dynamic(
  () => import("@/components/tutor-navbar").then((m) => ({ default: m.TutorNavbar })),
  { loading: () => null },
);
const LevelUpExperience = dynamic(
  () => import("@/components/level-up-experience").then((m) => ({ default: m.LevelUpExperience })),
  { ssr: false, loading: () => null },
);
const PushNotificationOptIn = dynamic(
  () =>
    import("@/components/push-notification-opt-in").then((m) => ({
      default: m.PushNotificationOptIn,
    })),
  { ssr: false, loading: () => null },
);
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

const XP_CACHE_KEY = "mentrixa-xp-cache";

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

function playGlobalClickSound(audioContext: AudioContext) {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  const base = 860 + Math.random() * 120;

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(base, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(base * 0.78, audioContext.currentTime + 0.03);

  gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.03, audioContext.currentTime + 0.005);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.045);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.05);

  oscillator.onended = () => {
    oscillator.disconnect();
    gainNode.disconnect();
  };
}

function getGlobalClickSoundTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;

  const explicit = target.closest("[data-click-sound]");
  if (explicit instanceof HTMLElement) {
    return explicit.getAttribute("data-click-sound") === "false" ? null : explicit;
  }

  const auto = target.closest(
    "button, a, [role='button'], [role='tab'], [role='menuitem'], [role='option'], [role='switch'], [role='checkbox'], input, select, label",
  );
  return auto instanceof HTMLElement ? auto : null;
}

/** Inlined in the app shell so webpack never emits a separate lazy chunk for click sounds. */
function useGlobalClickSounds(): void {
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastPlayedAtRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const AudioContextCtor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    const getAudioContext = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextCtor();
      }
      return audioContextRef.current;
    };

    const handleClick = (event: MouseEvent) => {
      const target = getGlobalClickSoundTarget(event.target);
      if (!target) return;
      if (target.getAttribute("data-click-sound") === "false") return;
      if (target.getAttribute("aria-disabled") === "true" || target.hasAttribute("disabled")) return;

      const now = Date.now();
      if (now - lastPlayedAtRef.current < 28) return;
      lastPlayedAtRef.current = now;

      try {
        const audioContext = getAudioContext();
        if (audioContext.state === "suspended") {
          void audioContext.resume().catch(() => {});
        }
        playGlobalClickSound(audioContext);
      } catch {
        /* sound is best-effort */
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      void audioContextRef.current?.close().catch(() => {});
      audioContextRef.current = null;
    };
  }, []);
}

/** Stale chunks may still reference the old lazy provider export — no-op keeps HMR stable. */
export function ClickSoundProvider() {
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

  useGlobalClickSounds();

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
    pathname.includes("/mastery") ||
    pathname.includes("/sessions-ai");
  const isArenaRoute =
    pathname.includes("/duel") ||
    pathname.includes("/division");

  return (
    <ErrorBoundary>
      {!isVideoRoute ? <NavigationProgress /> : null}
      <UiPerformanceBootstrap />
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
