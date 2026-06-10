"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AuthUser } from "@/shared/core/auth";
import { FirstLoginTourPanel } from "@/components/first-login-tour-panel";

type TutorTourStep = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: "/icons/guide.svg";
  isMatch: (path: string, userId: string) => boolean;
};

const TOUR_VERSION = "v1";

function completedKey(userId: string) {
  return `mentrixa:tutor-tour:completed:${TOUR_VERSION}:${userId}`;
}

function progressKey(userId: string) {
  return `mentrixa:tutor-tour:step:${TOUR_VERSION}:${userId}`;
}

function profileConfirmedKey(userId: string) {
  return `mentrixa:tutor-tour:profile-confirmed:${TOUR_VERSION}:${userId}`;
}

export function TutorFirstLoginTour({ user }: { user: AuthUser }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [profileConfirmed, setProfileConfirmed] = useState(false);

  const steps = useMemo<TutorTourStep[]>(
    () => [
      {
        id: "profile",
        title: "Must complete: profile",
        description: "Set your guide profile first. This is required before the rest of your tutor setup.",
        href: `/tutor/${user.id}`,
        icon: "/icons/guide.svg",
        isMatch: (path, userId) => path === `/tutor/${userId}`,
      },
      {
        id: "studio",
        title: "Open Studio",
        description: "Use Studio to prepare sessions, workflow, and AI teaching support.",
        href: "/tutor/sessions-ai",
        icon: "/icons/guide.svg",
        isMatch: (path) => path === "/tutor/sessions-ai" || path.startsWith("/tutor/sessions-ai/"),
      },
      {
        id: "sessions",
        title: "Manage Home",
        description: "Your Guide center — bookings, calendar, availability, and payouts.",
        href: "/tutor",
        icon: "/icons/guide.svg",
        isMatch: (path) => path === "/tutor",
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
    if (!pathname.startsWith("/tutor")) {
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
    <FirstLoginTourPanel
      titleId="tutor-tour-title"
      className="border-indigo-400/55 bg-gradient-to-br from-indigo-950/98 via-violet-950/98 to-blue-950/98 shadow-[0_20px_55px_rgba(37,99,235,0.45)]"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="inline-flex min-w-0 items-center gap-2">
          <div className="shrink-0 rounded-lg border border-indigo-300/45 bg-indigo-400/15 p-1.5">
            <Image src={step.icon} alt="" width={22} height={22} className="h-[22px] w-[22px]" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
            Step {currentStep + 1}/{steps.length}
          </p>
        </div>
        <button
          type="button"
          onClick={finalizeTour}
          className="shrink-0 rounded-md border border-indigo-300/40 bg-indigo-400/10 px-2 py-0.5 text-[10px] font-semibold text-blue-500 hover:bg-indigo-400/20 hover:text-blue-50"
        >
          Skip
        </button>
      </div>

      <h2 id="tutor-tour-title" className="text-base font-bold leading-snug text-blue-500">
        {step.title}
      </h2>
      <p className="mt-1.5 text-[12px] leading-relaxed text-purple-600">{step.description}</p>

      {isProfileStep && !isOnStepPage ? (
        <p className="mt-2 rounded-lg border border-indigo-300/50 bg-indigo-400/14 px-2 py-1.5 text-[10px] leading-snug text-blue-500">
          Opening your guide profile — complete it on the page, then confirm below.
        </p>
      ) : null}

      {needsProfileCheckbox ? (
        <label className="mt-2 flex cursor-pointer items-start gap-2 rounded-lg border border-indigo-300/50 bg-indigo-400/14 p-2 text-[12px] font-medium text-blue-500">
          <input
            type="checkbox"
            checked={profileConfirmed}
            onChange={(event) => setProfileConfirmed(event.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-indigo-200/70 bg-transparent accent-cyan-200"
          />
          <span>I saved my profile — continue to the next step.</span>
        </label>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          disabled={currentStep === 0}
          onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
          className="rounded-lg border border-indigo-300/55 bg-indigo-400/18 px-3 py-1.5 text-[11px] font-semibold text-purple-600 hover:bg-indigo-400/28 disabled:cursor-not-allowed disabled:opacity-40"
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
          className="rounded-lg bg-gradient-to-r from-indigo-300 to-blue-300 px-3 py-1.5 text-[11px] font-bold text-purple-600 hover:from-indigo-200 hover:to-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {primaryLabel}
        </button>
      </div>
    </FirstLoginTourPanel>
  );
}
