"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AuthUser } from "@/lib/auth";
import { FirstLoginTourPanel } from "@/components/first-login-tour-panel";

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

  useEffect(() => {
    if (!open) return;
    const step = steps[currentStep];
    if (!step || step.id !== "profile") return;
    if (step.isMatch(pathname, user.id)) return;
    router.replace(`${step.href}?onboarding=true`);
  }, [open, currentStep, pathname, router, steps, user.id]);

  useEffect(() => {
    const step = steps[currentStep];
    if (!open || !step || step.id !== "profile") return;
    if (!step.isMatch(pathname, user.id)) setProfileConfirmed(false);
  }, [open, currentStep, pathname, steps, user.id]);

  if (!open) return null;
  const step = steps[currentStep];
  if (!step) return null;
  const isOnStepPage = step.isMatch(pathname, user.id);
  const isProfileStep = step.id === "profile";
  const needsProfileCheckbox = isProfileStep && isOnStepPage;
  const blockNext =
    isProfileStep && isOnStepPage && !profileConfirmed;
  const isLast = currentStep === steps.length - 1;

  const primaryLabel = (() => {
    if (isLast && isOnStepPage) return "Finish";
    if (!isOnStepPage) return isProfileStep ? "Open profile" : "Go";
    return "Next";
  })();

  return (
    <FirstLoginTourPanel titleId="student-tour-title">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="inline-flex min-w-0 items-center gap-2">
          <div className="shrink-0 rounded-lg border border-white/10 bg-white/10 p-1.5">
            <Image src={step.icon} alt="" width={22} height={22} className="h-[22px] w-[22px]" />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/65">
            Step {currentStep + 1}/{steps.length}
          </p>
        </div>
        <button
          type="button"
          onClick={finalizeTour}
          className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium text-white/65 hover:bg-white/10 hover:text-white"
        >
          Skip
        </button>
      </div>

      <h2 id="student-tour-title" className="text-base font-semibold leading-snug text-white">
        {step.title}
      </h2>
      <p className="mt-1.5 text-[11px] leading-relaxed text-slate-200/90">{step.description}</p>

      {isProfileStep && !isOnStepPage ? (
        <p className="mt-2 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-[10px] leading-snug text-white/75">
          Taking you to your profile — fill it out on the page, then confirm below.
        </p>
      ) : null}

      {needsProfileCheckbox ? (
        <label className="mt-2 flex cursor-pointer items-start gap-2 rounded-lg border border-white/12 bg-white/[0.05] p-2 text-[11px] text-slate-100">
          <input
            type="checkbox"
            checked={profileConfirmed}
            onChange={(event) => setProfileConfirmed(event.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-white/30 bg-transparent accent-white"
          />
          <span>I saved my profile — continue to the next step.</span>
        </label>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          disabled={currentStep === 0}
          onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
          className="rounded-lg border border-white/18 px-3 py-1.5 text-[11px] font-medium text-white/85 disabled:cursor-not-allowed disabled:opacity-40"
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
          className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-900 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {primaryLabel}
        </button>
      </div>
    </FirstLoginTourPanel>
  );
}
