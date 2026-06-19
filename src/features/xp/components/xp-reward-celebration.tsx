"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { fireXpRewardConfetti } from "@/features/xp/confetti-burst";
import type { XpAwardEvent } from "@/features/xp/xp-events";
import { xpRewardMessage } from "@/features/xp/xp-events";

const LOGO_SRC = "/mentrixalogo/logo.webp";
const AUTO_DISMISS_MS = 2800;
const MIN_VISIBLE_MS = 900;

type LogoParticleSpec = {
  id: number;
  angle: number;
  distance: number;
  size: number;
  delay: number;
};

type SparkleSpec = {
  id: number;
  x: number;
  y: number;
  delay: number;
  size: number;
};

function buildLogoParticles(count: number): LogoParticleSpec[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    angle: (i / count) * Math.PI * 2 + Math.random() * 0.4,
    distance: 56 + Math.random() * 72,
    size: 12 + Math.random() * 14,
    delay: Math.random() * 0.12,
  }));
}

function buildSparkles(count: number): SparkleSpec[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const radius = 88 + (i % 3) * 18;
    return {
      id: i,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      delay: i * 0.08,
      size: 12 + (i % 2) * 4,
    };
  });
}

function LogoParticleBurst({ lite }: { lite: boolean }) {
  const particles = useMemo(() => buildLogoParticles(lite ? 6 : 14), [lite]);

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {particles.map((p) => (
        <motion.img
          key={p.id}
          src={LOGO_SRC}
          alt=""
          aria-hidden
          initial={{ x: 0, y: 0, opacity: 0.95, scale: 0.25, rotate: 0 }}
          animate={{
            x: Math.cos(p.angle) * p.distance,
            y: Math.sin(p.angle) * p.distance,
            opacity: 0,
            scale: 0.55,
            rotate: (Math.random() - 0.5) * 120,
          }}
          transition={{ duration: lite ? 0.65 : 0.95, delay: 0.08 + p.delay, ease: "easeOut" }}
          className="absolute left-1/2 top-1/2 object-contain"
          style={{
            width: p.size,
            height: p.size,
            marginLeft: -p.size / 2,
            marginTop: -p.size / 2,
          }}
        />
      ))}
    </div>
  );
}

function SparkleRing({ lite }: { lite: boolean }) {
  const sparkles = useMemo(() => buildSparkles(lite ? 5 : 10), [lite]);

  return (
    <>
      {sparkles.map((s) => (
        <motion.div
          key={s.id}
          className="pointer-events-none absolute text-amber-300"
          style={{
            left: `calc(50% + ${s.x}px)`,
            top: `calc(50% + ${s.y}px)`,
            marginLeft: -s.size / 2,
            marginTop: -s.size / 2,
          }}
          initial={{ opacity: 0, scale: 0, rotate: -20 }}
          animate={{
            opacity: [0, 1, 0.85, 0],
            scale: [0, 1.25, 1, 0.7],
            rotate: [0, 18, -8],
          }}
          transition={{
            duration: lite ? 0.9 : 1.35,
            delay: 0.15 + s.delay,
            ease: "easeOut",
          }}
        >
          <Sparkles style={{ width: s.size, height: s.size }} aria-hidden />
        </motion.div>
      ))}
    </>
  );
}

export function XpRewardCelebration({
  event,
  lite,
  onDismiss,
}: {
  event: (XpAwardEvent & { id?: string }) | null;
  lite: boolean;
  onDismiss: () => void;
}) {
  const [canDismiss, setCanDismiss] = useState(false);
  const fxPlayedRef = useRef(false);
  const openedAtRef = useRef<number | null>(null);

  const message = event ? xpRewardMessage(event) : "";

  useEffect(() => {
    if (!event) {
      setCanDismiss(false);
      fxPlayedRef.current = false;
      openedAtRef.current = null;
      return;
    }

    openedAtRef.current = Date.now();
    setCanDismiss(false);

    const unlockTimer = window.setTimeout(() => setCanDismiss(true), MIN_VISIBLE_MS);
    const autoTimer = window.setTimeout(() => onDismiss(), AUTO_DISMISS_MS);

    if (!fxPlayedRef.current) {
      fxPlayedRef.current = true;
      if (!lite) void fireXpRewardConfetti();
    }

    return () => {
      window.clearTimeout(unlockTimer);
      window.clearTimeout(autoTimer);
    };
  }, [event, lite, onDismiss]);

  const tryDismiss = useCallback(() => {
    if (!canDismiss) return;
    onDismiss();
  }, [canDismiss, onDismiss]);

  return (
    <AnimatePresence>
      {event ? (
        <motion.div
          key={event.id ?? `xp-celebration-${event.amount}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-auto fixed inset-0 z-[110] flex items-center justify-center px-4"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.72)" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="xp-reward-title"
          onClick={tryDismiss}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.55, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: -12 }}
            transition={{ type: "spring", stiffness: 340, damping: 22 }}
            className="relative w-full max-w-sm overflow-visible"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative overflow-hidden rounded-3xl border border-violet-400/35 bg-[linear-gradient(165deg,#1e1b4b_0%,#312e81_42%,#0f172a_100%)] px-8 py-10 text-center shadow-[0_24px_64px_-20px_rgba(79,70,229,0.65)]">
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.07]"
                style={{
                  backgroundImage: `url('${LOGO_SRC}')`,
                  backgroundSize: "72px 72px",
                  backgroundRepeat: "repeat",
                }}
                aria-hidden
              />

              <div className="relative mx-auto flex h-36 w-36 items-center justify-center">
                {!lite ? <SparkleRing lite={lite} /> : null}
                {!lite ? <LogoParticleBurst lite={lite} /> : null}
                <motion.div
                  initial={{ scale: 0.2, rotate: -18 }}
                  animate={{ scale: [0.2, 1.12, 1], rotate: [-18, 6, 0] }}
                  transition={{ duration: 0.55, ease: "easeOut" }}
                  className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 ring-2 ring-violet-300/40 shadow-[0_0_32px_rgba(167,139,250,0.45)]"
                >
                  <Image
                    src={LOGO_SRC}
                    alt="Mentrixa"
                    width={56}
                    height={56}
                    className="h-14 w-14 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]"
                    priority
                  />
                </motion.div>
              </div>

              <motion.p
                id="xp-reward-title"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.35 }}
                className="mt-2 font-mono text-4xl font-black tabular-nums tracking-tight text-emerald-300"
                style={{ textShadow: "0 0 24px rgba(52, 211, 153, 0.45)" }}
              >
                +{event.amount} XP
              </motion.p>

              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.35 }}
                className="mt-2 text-sm font-semibold text-violet-100"
              >
                {message}
              </motion.p>

              {event.nextObjective ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.28, duration: 0.35 }}
                  className="mt-2 text-xs leading-relaxed text-violet-200/75"
                >
                  {event.nextObjective}
                </motion.p>
              ) : null}

              {canDismiss ? (
                <button
                  type="button"
                  className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300/70 transition hover:text-white"
                  onClick={tryDismiss}
                >
                  Tap to continue
                </button>
              ) : (
                <p className="mt-6 text-[11px] uppercase tracking-[0.2em] text-violet-400/50">
                  Reward secured…
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
