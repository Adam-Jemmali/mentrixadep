"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { onXpAward } from "@/lib/xp-events";

interface XpCounterProps {
  totalXp: number;
}

export function XpCounter({ totalXp }: XpCounterProps) {
  const [displayXp, setDisplayXp] = useState(totalXp);
  const [pulse, setPulse] = useState(false);
  const pulseTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setDisplayXp(totalXp);
  }, [totalXp]);

  useEffect(() => {
    const unsubscribe = onXpAward(() => {
      setPulse(true);
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
      pulseTimeoutRef.current = setTimeout(() => {
        setPulse(false);
      }, 600);
    });

    return () => {
      unsubscribe();
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    };
  }, []);

  return (
    <motion.div
      animate={pulse ? { scale: [1, 1.15, 1] } : { scale: 1 }}
      transition={{ duration: 0.6 }}
      className="inline-flex items-center gap-1 text-xs font-mono text-white/90"
    >
      <span>{displayXp.toLocaleString()}</span>
      <span className="text-white/70">XP</span>
    </motion.div>
  );
}
