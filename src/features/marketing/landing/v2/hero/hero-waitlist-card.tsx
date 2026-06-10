"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { submitOnboardingRequest } from "@/features/registration/onboarding-request-client";
import { type SliceRole } from "@/features/marketing/landing/v2/motion/falling-role-slice-arena";
import { easeOutExpo, springSoft } from "@/features/marketing/landing/v2/motion/landing-motion";
import { useLandingMotion } from "@/features/marketing/landing/v2/motion/use-landing-motion";
import { HeroWaitlistNinjaStage } from "@/features/marketing/landing/v2/hero/hero-waitlist-ninja-stage";
import { HeroWaitlistSliceBurst } from "@/features/marketing/landing/v2/hero/hero-waitlist-slice-burst";
import { HeroWaitlistFormPop } from "@/features/marketing/landing/v2/hero/hero-waitlist-form-pop";
import type { CoachRevealData } from "@/features/marketing/landing/v2/hero/hero-waitlist-coach-reveal";

const BURST_MS = 480;

type WaitlistRole = "student" | "tutor";

const ROLE_COPY: Record<
  WaitlistRole,
  { headline: string; cta: string; slides: [string, string, string] }
> = {
  student: {
    headline: "Your rank updates every time you show up",
    cta: "Claim my spot →",
    slides: [
      "Every quest, every duel, every session.",
      "One public number that tells the truth.",
      "Book a Guide when the wall is real.",
    ],
  },
  tutor: {
    headline: "Teach any skill. Get paid fast.",
    cta: "Start earning as a Guide",
    slides: [
      "You set subjects, rate, and hours",
      "Stripe pays when the session ends",
      "Quest builds the follow up pack",
    ],
  },
};

const gameShatterExit = {
  opacity: 0,
  scale: 1.12,
  rotate: 3,
  filter: "blur(14px)",
  transition: { duration: 0.38, ease: easeOutExpo },
};

function sliceToWaitlistRole(winner: SliceRole): WaitlistRole {
  return winner === "Mentrixer" ? "student" : "tutor";
}

export function HeroWaitlistCard() {
  const { cinematic, mounted } = useLandingMotion();
  const gameCompletedRef = useRef(false);
  const completingRef = useRef(false);
  const burstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [phase, setPhase] = useState<"game" | "form">("game");
  const [bursting, setBursting] = useState(false);
  const [burstAccent, setBurstAccent] = useState<"learn" | "teach">("learn");

  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistRole, setWaitlistRole] = useState<WaitlistRole>("student");
  const [waitlistMsg, setWaitlistMsg] = useState<string | null>(null);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);
  const [coachReveal, setCoachReveal] = useState<CoachRevealData | null>(null);
  const [gameKey, setGameKey] = useState(0);

  const roleCopy = ROLE_COPY[waitlistRole];
  const showForm = mounted && gameCompletedRef.current && phase === "form";

  useEffect(() => {
    gameCompletedRef.current = false;
    completingRef.current = false;
    setPhase("game");
    setBursting(false);
    setCoachReveal(null);
    return () => {
      if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!showForm) return;
    const id = window.setInterval(() => {
      setSlideIdx((n) => (n + 1) % roleCopy.slides.length);
    }, 3500);
    return () => window.clearInterval(id);
  }, [showForm, roleCopy.slides.length]);

  useEffect(() => {
    setSlideIdx(0);
  }, [waitlistRole]);

  const handleGameComplete = useCallback((winner: SliceRole, scores: { Mentrixer: number; Guide: number }) => {
    if (completingRef.current || gameCompletedRef.current) return;
    completingRef.current = true;

    const role = sliceToWaitlistRole(winner);
    const count = winner === "Mentrixer" ? scores.Mentrixer : scores.Guide;
    setWaitlistRole(role);
    setBurstAccent(winner === "Mentrixer" ? "learn" : "teach");
    setCoachReveal({
      sliceCount: count,
      side: winner === "Mentrixer" ? "learn" : "teach",
      role,
    });
    setBursting(true);

    if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
    burstTimerRef.current = setTimeout(() => {
      gameCompletedRef.current = true;
      setBursting(false);
      setPhase("form");
      completingRef.current = false;
      burstTimerRef.current = null;
    }, BURST_MS);
  }, []);

  const submitWaitlist = useCallback(async () => {
    setWaitlistMsg(null);
    const email = waitlistEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setWaitlistMsg("Enter a valid email.");
      return;
    }
    setWaitlistLoading(true);
    try {
      const result = await submitOnboardingRequest(email, waitlistRole);
      if (result.outcome === "error" || result.outcome === "rejected") {
        setWaitlistMsg(result.error ?? "Could not start access request.");
      } else if (result.outcome === "approved") {
        setWaitlistMsg(result.message ?? "You're already approved. Complete signup now.");
      } else {
        setWaitlistMsg(result.message ?? "You're in onboarding. Check your email for next steps.");
      }
    } catch {
      setWaitlistMsg("Could not start access request.");
    } finally {
      setWaitlistLoading(false);
    }
  }, [waitlistEmail, waitlistRole]);

  const replayGame = useCallback(() => {
    if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
    gameCompletedRef.current = false;
    completingRef.current = false;
    setBursting(false);
    setGameKey((k) => k + 1);
    setPhase("game");
    setCoachReveal(null);
    setWaitlistMsg(null);
  }, []);

  return (
    <motion.div
      id="waitlist"
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springSoft, delay: 0.12 }}
      className="lp-hero-glass lp-ninja-card relative w-full max-w-md overflow-hidden rounded-2xl p-3 sm:p-4"
    >
      {cinematic ? (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl"
          animate={{
            boxShadow: [
              "inset 0 0 0 1px rgba(167,139,250,0.08)",
              "inset 0 0 0 1px rgba(129,140,248,0.35)",
              "inset 0 0 0 1px rgba(167,139,250,0.08)",
            ],
          }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : null}

      <AnimatePresence mode="wait">
        {!showForm ? (
          <motion.div
            key={`game-${gameKey}`}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={gameShatterExit}
            className="relative"
          >
            <HeroWaitlistNinjaStage gameKey={gameKey} onComplete={handleGameComplete} />
            <HeroWaitlistSliceBurst active={bursting} accent={burstAccent} />
          </motion.div>
        ) : (
          <motion.div
            key={`form-${waitlistRole}-${gameKey}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.25 } }}
          >
            <HeroWaitlistFormPop
              role={waitlistRole}
              roleCopy={roleCopy}
              coachReveal={coachReveal}
              slideIdx={slideIdx}
              onSlideIdx={setSlideIdx}
              email={waitlistEmail}
              onEmail={setWaitlistEmail}
              waitlistRole={waitlistRole}
              onRole={setWaitlistRole}
              loading={waitlistLoading}
              message={waitlistMsg}
              onSubmit={() => void submitWaitlist()}
              onReplay={replayGame}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
