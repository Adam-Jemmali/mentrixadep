"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { onXpAward, type XpAwardEvent } from "@/lib/xp-events";

interface FloatingXpParticle {
  id: string;
  amount: number;
  startX: number;
  startY: number;
}

export function FloatingXpAnimations() {
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
      };

      setParticles((prev) => [...prev, particle]);

      // Auto-remove after animation
      setTimeout(() => {
        setParticles((prev) => prev.filter((p) => p.id !== particle.id));
      }, 1200);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{ x: particle.startX, y: particle.startY, opacity: 1, scale: 1 }}
            animate={{
              x: window.innerWidth - 80,
              y: 20,
              opacity: 0,
              scale: 0.8,
            }}
            transition={{
              duration: 1,
              ease: "easeOut",
            }}
            className="absolute text-base font-bold text-emerald-500"
            style={{
              textShadow: "0 0 8px rgba(16, 185, 129, 0.5)",
            }}
          >
            +{particle.amount} XP
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
