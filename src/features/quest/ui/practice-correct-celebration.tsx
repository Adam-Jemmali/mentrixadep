"use client";

import { useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { PromptWithMath } from "@/features/quest/ui/prompt-with-math";
import { fireCorrectAnswerConfetti } from "@/features/quest/ui/practice-correct-confetti";

const LOGO_SRC = "/mentrixalogo/logo.webp";

function LogoParticleBurst({ lite }: { lite?: boolean }) {
  const particles = useMemo(
    () =>
      Array.from({ length: lite ? 6 : 12 }, (_, i) => ({
        id: i,
        angle: (i / 12) * Math.PI * 2 + Math.random() * 0.35,
        distance: 52 + Math.random() * 68,
        size: 11 + Math.random() * 12,
        delay: Math.random() * 0.1,
      })),
    [lite],
  );

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {particles.map((p) => (
        <motion.img
          key={p.id}
          src={LOGO_SRC}
          alt=""
          aria-hidden
          initial={{ x: 0, y: 0, opacity: 0.9, scale: 0.2 }}
          animate={{
            x: Math.cos(p.angle) * p.distance,
            y: Math.sin(p.angle) * p.distance,
            opacity: 0,
            scale: 0.5,
          }}
          transition={{ duration: 0.85, delay: 0.06 + p.delay, ease: "easeOut" }}
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

export function PracticeCorrectCelebration({
  open,
  explanation,
  onNext,
  nextLabel = "Next question",
  lite = false,
}: {
  open: boolean;
  explanation: string;
  onNext: () => void;
  nextLabel?: string;
  lite?: boolean;
}) {
  const fxPlayedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      fxPlayedRef.current = false;
      return;
    }
    if (!fxPlayedRef.current) {
      fxPlayedRef.current = true;
      if (!lite) void fireCorrectAnswerConfetti();
    }
  }, [open, lite]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="practice-correct-celebration"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="pointer-events-auto fixed inset-0 z-[105] flex items-center justify-center px-4"
          style={{ backgroundColor: "rgba(6, 78, 59, 0.55)" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="practice-correct-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -16 }}
            transition={{ type: "spring", stiffness: 360, damping: 24 }}
            className="relative w-full max-w-md overflow-visible"
          >
            <div className="relative overflow-hidden rounded-3xl border border-emerald-300/50 bg-[linear-gradient(165deg,#064e3b_0%,#047857_38%,#0f172a_100%)] px-6 py-8 text-center shadow-[0_24px_64px_-20px_rgba(16,185,129,0.55)] sm:px-8 sm:py-10">
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.06]"
                style={{
                  backgroundImage: `url('${LOGO_SRC}')`,
                  backgroundSize: "64px 64px",
                  backgroundRepeat: "repeat",
                }}
                aria-hidden
              />

              <div className="relative mx-auto flex h-32 w-32 items-center justify-center">
                {!lite ? <LogoParticleBurst lite={lite} /> : null}
                {!lite
                  ? [0, 1, 2, 3, 4, 5].map((i) => (
                      <motion.div
                        key={i}
                        className="pointer-events-none absolute text-emerald-200"
                        style={{
                          left: `calc(50% + ${Math.cos((i / 6) * Math.PI * 2) * 72}px)`,
                          top: `calc(50% + ${Math.sin((i / 6) * Math.PI * 2) * 72}px)`,
                        }}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0.6] }}
                        transition={{ duration: 1.1, delay: 0.1 + i * 0.07 }}
                      >
                        <Sparkles className="h-4 w-4" aria-hidden />
                      </motion.div>
                    ))
                  : null}
                <motion.div
                  initial={{ scale: 0.15, rotate: -24 }}
                  animate={{ scale: [0.15, 1.15, 1], rotate: [-24, 8, 0] }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="relative z-10 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-emerald-400/20 ring-2 ring-emerald-300/60 shadow-[0_0_40px_rgba(52,211,153,0.5)]"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.18, type: "spring", stiffness: 420, damping: 16 }}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400"
                  >
                    <Check className="h-8 w-8 text-emerald-950 stroke-[3]" aria-hidden />
                  </motion.div>
                  <Image
                    src={LOGO_SRC}
                    alt=""
                    width={22}
                    height={22}
                    className="absolute -bottom-1 -right-1 h-[22px] w-[22px] rounded-md bg-white/90 p-0.5 object-contain shadow-md"
                    aria-hidden
                  />
                </motion.div>
              </div>

              <motion.h2
                id="practice-correct-title"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14, duration: 0.35 }}
                className="mt-3 text-3xl font-black tracking-tight text-emerald-100"
                style={{ textShadow: "0 0 28px rgba(110, 231, 183, 0.35)" }}
              >
                Correct!
              </motion.h2>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22, duration: 0.35 }}
                className="mx-surface-light mt-4 max-h-[min(42vh,20rem)] overflow-x-auto overflow-y-auto rounded-2xl border border-emerald-200/80 bg-white px-4 py-3 text-left text-sm leading-relaxed text-zinc-800"
              >
                <PromptWithMath text={explanation} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.35 }}
              >
                <Button
                  className="mt-6 min-w-[10rem] bg-emerald-400 text-emerald-950 hover:bg-emerald-300 font-semibold shadow-[0_8px_24px_-8px_rgba(52,211,153,0.65)]"
                  onClick={onNext}
                >
                  {nextLabel}
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
