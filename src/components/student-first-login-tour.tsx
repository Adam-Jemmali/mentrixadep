"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AuthUser } from "@/lib/auth";

type StudentTourStep = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: "/icons/mentrixer.svg" | "/icons/guide.svg";
  isMatch: (path: string, userId: string) => boolean;
};

const TOUR_VERSION = "v1";

function completedKey(userId: string) {
  return `mentrixa:student-tour:completed:${TOUR_VERSION}:${userId}`;
}

function progressKey(userId: string) {
  return `mentrixa:student-tour:step:${TOUR_VERSION}:${userId}`;
}

function profileConfirmedKey(userId: string) {
  return `mentrixa:student-tour:profile-confirmed:${TOUR_VERSION}:${userId}`;
}

export function StudentFirstLoginTour({ user }: { user: AuthUser }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [profileConfirmed, setProfileConfirmed] = useState(false);

  const steps = useMemo<StudentTourStep[]>(
    () => [
      {
        id: "profile",
        title: "Complete your profile",
        description: "Set your profile and preferences so Mentrixa can personalize your learning.",
        href: `/student/${user.id}`,
        icon: "/icons/mentrixer.svg",
        isMatch: (path, userId) => path === `/student/${userId}`,
      },
      {
        id: "duels",
        title: "Try Duels",
        description: "Challenge learners, build speed, and earn XP through quick head-to-head duels.",
        href: "/student/duel",
        icon: "/icons/guide.svg",
        isMatch: (path) => path === "/student/duel" || path.startsWith("/student/duel/"),
      },
      {
        id: "clan",
        title: "Join a Clan",
        description: "Find your learning crew to stay motivated, collaborate, and climb together.",
        href: "/student/clan",
        icon: "/icons/mentrixer.svg",
        isMatch: (path) => path === "/student/clan" || path.startsWith("/student/clan/"),
      },
      {
        id: "division",
        title: "Enter Division",
        description: "Track your rank and compete in your division leaderboard each week.",
        href: "/student/division",
        icon: "/icons/guide.svg",
        isMatch: (path) => path === "/student/division" || path.startsWith("/student/division/"),
      },
      {
        id: "path",
        title: "Set your Path",
        description: "Use your learning path to focus on the exact topics you want to master next.",
        href: "/student/learning-path",
        icon: "/icons/mentrixer.svg",
        isMatch: (path) => path === "/student/learning-path" || path.startsWith("/student/learning-path/"),
      },
      {
        id: "quest",
        title: "Play Quest",
        description: "Run daily quest practice to sharpen concepts and keep your progress momentum.",
        href: "/student/quest",
        icon: "/icons/guide.svg",
        isMatch: (path) => path === "/student/quest" || path.startsWith("/student/quest/"),
      },
      {
        id: "sessions",
        title: "Book Sessions",
        description: "Schedule live sessions with guides and keep your growth consistent.",
        href: "/student",
        icon: "/icons/mentrixer.svg",
        isMatch: (path) => path === "/student",
      },
    ],
    [user.id],
  );

  const finalizeTour = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(completedKey(user.id), "1");
      localStorage.removeItem(progressKey(user.id));
      localStorage.removeItem(profileConfirmedKey(user.id));
    }
    setOpen(false);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("onboarding");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [pathname, router, searchParams, user.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!pathname.startsWith("/student")) {
      setOpen(false);
      return;
    }

    const done = localStorage.getItem(completedKey(user.id)) === "1";
    if (done) {
      setOpen(false);
      return;
    }

    const forced = searchParams.get("onboarding") === "true";
    const stored = localStorage.getItem(progressKey(user.id));
    if (!forced && stored == null) {
      setOpen(false);
      return;
    }

    const parsed = Number(stored);
    const nextStep = Number.isFinite(parsed) ? Math.max(0, Math.min(steps.length - 1, parsed)) : 0;
    const profileDone = localStorage.getItem(profileConfirmedKey(user.id)) === "1";
    setCurrentStep(nextStep);
    setProfileConfirmed(profileDone);
    setOpen(true);
  }, [pathname, searchParams, steps.length, user.id]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    localStorage.setItem(progressKey(user.id), String(currentStep));
  }, [currentStep, open, user.id]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    localStorage.setItem(profileConfirmedKey(user.id), profileConfirmed ? "1" : "0");
  }, [open, profileConfirmed, user.id]);

  if (!open) return null;
  const step = steps[currentStep];
  if (!step) return null;
  const isOnStepPage = step.isMatch(pathname, user.id);
  const isProfileStep = step.id === "profile";
  const blockNext = isProfileStep && !profileConfirmed;
  const isLast = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/55 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-tour-title"
        className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0e162f] p-5 text-slate-100 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="inline-flex items-center gap-3">
            <div className="rounded-xl border border-white/10 bg-white/10 p-2.5">
              <Image src={step.icon} alt="" width={28} height={28} className="h-7 w-7" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
              Step {currentStep + 1} of {steps.length}
            </p>
          </div>
          <button
            type="button"
            onClick={finalizeTour}
            className="rounded-md px-2 py-1 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white"
          >
            Skip tour
          </button>
        </div>

        <h2 id="student-tour-title" className="text-xl font-semibold text-white">
          {step.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-200/95">{step.description}</p>
        {isProfileStep ? (
          <label className="mt-4 flex items-start gap-2 rounded-lg border border-white/15 bg-white/5 p-3 text-sm text-slate-100">
            <input
              type="checkbox"
              checked={profileConfirmed}
              onChange={(event) => setProfileConfirmed(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-white/30 bg-transparent accent-white"
            />
            <span>I completed my profile.</span>
          </label>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={currentStep === 0}
            onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>
          <button
            type="button"
            disabled={blockNext}
            onClick={() => {
              if (!isOnStepPage) {
                router.push(`${step.href}?onboarding=true`);
                return;
              }
              if (isLast) {
                finalizeTour();
                return;
              }
              const nextStep = currentStep + 1;
              const target = steps[nextStep];
              setCurrentStep(nextStep);
              if (target) {
                router.push(`${target.href}?onboarding=true`);
              }
            }}
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLast ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
