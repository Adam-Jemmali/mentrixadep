"use client";

import { motion } from "framer-motion";
import { useLandingMotion } from "@/features/marketing/landing/v2/motion/use-landing-motion";

const BEAMS = [
  { left: "10%", delay: 0, duration: 7 },
  { left: "45%", delay: 1.2, duration: 9 },
  { left: "78%", delay: 0.6, duration: 8 },
];

const DOTS = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: `${(i * 17 + 7) % 100}%`,
  y: `${(i * 23 + 11) % 100}%`,
  size: 2 + (i % 3),
  delay: (i % 5) * 0.4,
}));

export function HeroAmbientLayer() {
  const { canLoop } = useLandingMotion();
  if (!canLoop) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {BEAMS.map((beam) => (
        <motion.div
          key={beam.left}
          className="absolute top-0 h-full w-px bg-gradient-to-b from-transparent via-indigo-400/20 to-transparent"
          style={{ left: beam.left }}
          animate={{ opacity: [0.15, 0.45, 0.15], scaleY: [0.85, 1, 0.85] }}
          transition={{
            duration: beam.duration,
            repeat: Infinity,
            delay: beam.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      {DOTS.map((dot) => (
        <motion.span
          key={dot.id}
          className="absolute rounded-full bg-indigo-300/30"
          style={{
            left: dot.x,
            top: dot.y,
            width: dot.size,
            height: dot.size,
          }}
          animate={{
            y: [0, -12, 0],
            opacity: [0.2, 0.7, 0.2],
            scale: [1, 1.4, 1],
          }}
          transition={{
            duration: 4 + (dot.id % 4),
            repeat: Infinity,
            delay: dot.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      <motion.div
        className="absolute left-1/2 top-[42%] h-[min(640px,110vw)] w-[min(640px,110vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.14)_0%,transparent_62%)]"
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 h-[min(520px,90vw)] w-[min(520px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-indigo-500/10"
        animate={{ rotate: 360, scale: [1, 1.03, 1] }}
        transition={{
          rotate: { duration: 60, repeat: Infinity, ease: "linear" },
          scale: { duration: 6, repeat: Infinity, ease: "easeInOut" },
        }}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 h-[min(380px,70vw)] w-[min(380px,70vw)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-400/8"
        animate={{ rotate: -360 }}
        transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
