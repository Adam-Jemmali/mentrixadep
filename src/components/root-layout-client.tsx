"use client";

/**
 * App shell client boundary (nav, consent, student overlays). Marketing landing lives in
 * `home-page-client.tsx` so this module stays smaller and dev does not multiplex two
 * heavy client trees through one webpack chunk graph.
 */

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Calendar, Swords, User, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fireLevelUpConfetti } from "@/lib/confetti-burst";
import { flushXpQueue } from "@/lib/pwa-xp-queue";
import { trackClientEvent } from "@/lib/use-track";
import type { AuthUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

const Navigation = dynamic(
  () => import("@/components/navigation").then((m) => m.Navigation),
  { loading: () => null },
);
import { ErrorBoundary } from "@/components/error-boundary";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { FeedbackWidget } from "@/components/feedback-widget";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const XP_CACHE_KEY = "mentrixa-xp-cache";
const PUSH_DISMISS_KEY = "mentrixa-push-prompt-dismissed";
const PUSH_SUBSCRIBED_KEY = "mentrixa-push-subscribed";

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
  return <Navigation user={user} />;
}

type LevelUpPayload = { to_level: number | null; title: string | null };

function LevelUpExperience({ user }: { user: AuthUser | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<LevelUpPayload | null>(null);
  const [streakBanner, setStreakBanner] = useState<string | null>(null);

  const uid = user?.id;
  const isStudent = user?.role === "student";
  const showStreak = Boolean(user && isStudent && pathname.startsWith("/student"));

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
        const hrs = s.hoursSinceAction != null ? Math.floor(s.hoursSinceAction) : 24;
        setStreakBanner(
          `Streak broken risk: ${hrs}h since your last activity. Your ${s.streakDays}-day streak is on the line — complete a quest or practice pack now.`,
        );
      } else {
        setStreakBanner(null);
      }
    } catch {
      setStreakBanner(null);
    }
  }, [uid, showStreak]);

  useEffect(() => {
    void refreshStreak();
  }, [refreshStreak]);

  useEffect(() => {
    if (!uid) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`user_achievements:${uid}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_achievements",
          filter: `user_id=eq.${uid}`,
        },
        (row) => {
          const n = row.new as {
            achievement_type?: string;
            to_level?: number | null;
            title?: string | null;
          };
          if (n.achievement_type === "level_up") {
            setPayload({ to_level: n.to_level ?? null, title: n.title ?? null });
            setOpen(true);
            void fireLevelUpConfetti();
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          trackClientEvent("realtime_reconnect", {
            channel: `user_achievements:${uid}`,
            reason: "subscribed",
          });
          return;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          trackClientEvent("realtime_disconnect", {
            channel: `user_achievements:${uid}`,
            reason: status.toLowerCase(),
          });
        }
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [uid]);

  if (!user || !isStudent) return null;

  return (
    <>
      {streakBanner && showStreak ? (
        <div className="fixed bottom-4 left-1/2 z-40 max-w-lg -translate-x-1/2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-xs text-amber-950 shadow-sm">
          {streakBanner}
        </div>
      ) : null}

      {open && payload ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 px-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="level-up-title"
        >
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center shadow-xl">
            <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400">Level up</p>
            <h2 id="level-up-title" className="mt-2 text-2xl font-medium tracking-tight text-slate-900">
              {payload.title ?? "New rank"}
            </h2>
            {payload.to_level != null ? (
              <p className="mt-2 font-mono text-sm text-slate-500">Level {payload.to_level}</p>
            ) : null}
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              You’ve crossed the next threshold. Keep the momentum — sessions, quests, and duels all add XP.
            </p>
            <button
              type="button"
              className="mt-8 w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              onClick={() => {
                setOpen(false);
                setPayload(null);
                void refreshStreak();
              }}
            >
              Continue
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function navIsActive(pathname: string, href: string): boolean {
  if (href === "/student") {
    return pathname === "/student" || pathname === "/student/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function StudentMobileBottomNav({ userId }: { userId: string }) {
  const pathname = usePathname();
  if (pathname === "/" || pathname.startsWith("/video/") || pathname.startsWith("/auth/")) {
    return null;
  }
  const profileHref = `/student/${userId}`;
  const links = [
    { href: "/student" as const, label: "Sessions", Icon: Calendar },
    { href: "/student/quest" as const, label: "Quest", Icon: BookOpen },
    { href: "/student/duel" as const, label: "Duels", Icon: Swords },
    { href: "/student/division" as const, label: "Division", Icon: UsersRound },
    { href: profileHref, label: "Profile", Icon: User },
  ];
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[60] border-t border-slate-200/90 bg-white/95 backdrop-blur-md md:hidden"
      aria-label="Student navigation"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between gap-0 px-1 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {links.map(({ href, label, Icon }) => {
          const active = navIsActive(pathname, href);
          return (
            <li key={href} className="min-w-0 flex-1">
              <Link
                href={href}
                className={cn(
                  "flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1.5 text-[10px] font-medium transition-colors",
                  active ? "text-[#1E3A5F]" : "text-slate-500 hover:text-slate-800",
                )}
              >
                <Icon className={cn("h-5 w-5 shrink-0", active && "text-[#1E3A5F]")} strokeWidth={active ? 2.25 : 2} />
                <span className="truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
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
          <DialogTitle className="text-lg font-semibold">Enable notifications?</DialogTitle>
          <DialogDescription className="text-sm text-slate-600 leading-relaxed">
            Get session reminders, duel challenges, level-up moments, and clan updates — without keeping Mentrixa open
            all day.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
          <Button type="button" variant="outline" className="min-h-[44px] w-full sm:w-auto" onClick={dismiss}>
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

export function RootLayoutClient({
  user,
  children,
}: {
  user: AuthUser | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isStudent = user?.role === "student";

  return (
    <ErrorBoundary>
      <ShellEffects />
      <AppNavOrNothing user={user} />
      <LevelUpExperience user={user} />
      {isStudent && user ? (
        <>
          <StudentMobileBottomNav userId={user.id} />
          <PushNotificationOptIn />
        </>
      ) : null}
      {user ? <FeedbackWidget /> : null}
      <CookieConsentBanner />
      <main
        className={cn(
          "relative min-h-screen",
          isHome
            ? "bg-[#0B1120]"
            : cn("pt-14 bg-[#FAFAFA] bg-mesh-blue", isStudent && "pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0"),
        )}
      >
        {isHome ? (
          <PageFade>{children}</PageFade>
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <PageFade>{children}</PageFade>
          </div>
        )}
      </main>
    </ErrorBoundary>
  );
}
