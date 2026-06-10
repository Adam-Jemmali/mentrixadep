"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { onXpAward, type XpAwardEvent } from "@/features/xp/xp-events";
import { useUiPerfTier } from "@/shared/core/use-ui-perf-tier";

interface FloatingXpParticle {
  id: string;
  amount: number;
  startX: number;
  startY: number;
  nextObjective?: string;
}

export function FloatingXpAnimations() {
  const tier = useUiPerfTier();
  const [particles, setParticles] = useState<FloatingXpParticle[]>([]);
  const particleIdRef = useRef(0);

  useEffect(() => {
    const unsubscribe = onXpAward((event: XpAwardEvent) => {
      // Determine source position
      let startX = window.innerWidth / 2;
      let startY = window.innerHeight / 2;

      if (event.position) {
        startX = event.position.x;
        startY = event.position.y;
      } else if (event.sourceElement) {
        const rect = event.sourceElement.getBoundingClientRect();
        startX = rect.left + rect.width / 2;
        startY = rect.top + rect.height / 2;
      }

      const particle: FloatingXpParticle = {
        id: `xp-${particleIdRef.current++}`,
        amount: event.amount,
        startX,
        startY,
        nextObjective: event.nextObjective,
      };

      setParticles((prev) => [...prev, particle]);

      // Auto-remove after animation
      const lingerMs = tier === "lite" ? 520 : 1200;
      setTimeout(() => {
        setParticles((prev) => prev.filter((p) => p.id !== particle.id));
      }, lingerMs);
    });

    return () => unsubscribe();
  }, [tier]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <AnimatePresence>
        {particles.map((particle, idx) =>
          tier === "lite" ? (
            <motion.div
              key={particle.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="absolute right-4 rounded-full bg-emerald-950/85 px-3 py-1.5 text-sm font-bold text-emerald-400 shadow-lg ring-1 ring-emerald-500/25"
              style={{
                top: `calc(max(5rem, env(safe-area-inset-top)) + ${Math.min(idx, 6) * 44}px)`,
                transform: "translateZ(0)",
              }}
            >
              <span>+{particle.amount} XP</span>
              {particle.nextObjective ? (
                <span className="ml-1 opacity-85">· {particle.nextObjective}</span>
              ) : null}
            </motion.div>
          ) : (
            <motion.div
              key={particle.id}
              initial={{ x: particle.startX, y: particle.startY, opacity: 1, scale: 1 }}
              animate={{
                x: typeof window !== "undefined" ? window.innerWidth - 80 : particle.startX,
                y: 20,
                opacity: 0,
                scale: 0.8,
              }}
              transition={{
                duration: 0.85,
                ease: "easeOut",
              }}
              className="absolute text-base font-bold text-emerald-500 will-change-transform"
              style={{
                textShadow: "0 0 8px rgba(16, 185, 129, 0.5)",
              }}
            >
              <span>+{particle.amount} XP</span>
              {particle.nextObjective ? (
                <span className="ml-1 text-xs text-emerald-300/90">· {particle.nextObjective}</span>
              ) : null}
            </motion.div>
          ),
        )}
      </AnimatePresence>
    </div>
  );
}
