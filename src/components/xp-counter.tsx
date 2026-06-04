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
  const [nextObjective, setNextObjective] = useState<string | null>(null);
  const pulseTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setDisplayXp(totalXp);
  }, [totalXp]);

  useEffect(() => {
    const unsubscribe = onXpAward((event) => {
      setPulse(true);
      if (event.nextObjective) {
        setNextObjective(event.nextObjective);
      }
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
      pulseTimeoutRef.current = setTimeout(() => {
        setPulse(false);
        setNextObjective(null);
      }, 600);
    });

    return () => {
      unsubscribe();
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    };
  }, []);

  return (
    <div className="inline-flex items-center gap-2">
      <motion.div
        animate={pulse ? { scale: [1, 1.15, 1] } : { scale: 1 }}
        transition={{ duration: 0.6 }}
        className="inline-flex items-center gap-1 text-xs font-mono text-white/90"
      >
        <span>{displayXp.toLocaleString()}</span>
        <span className="text-white/70">XP</span>
      </motion.div>
      {nextObjective ? (
        <span className="hidden rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/85 sm:inline-flex">
          Next: {nextObjective}
        </span>
      ) : null}
    </div>
  );
}
