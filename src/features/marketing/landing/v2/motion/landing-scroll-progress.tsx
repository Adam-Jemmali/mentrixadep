"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useMounted } from "@/features/marketing/landing/v2/motion/use-mounted";

export function LandingScrollProgress() {
  const mounted = useMounted();
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, (v) => v);

  if (!mounted) {
    return <div className="lp-scroll-progress" style={{ transform: "scaleX(0)" }} aria-hidden />;
  }

  return (
    <motion.div
      className="lp-scroll-progress"
      style={{ scaleX }}
      aria-hidden
    />
  );
}
