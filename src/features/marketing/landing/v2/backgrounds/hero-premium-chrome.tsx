"use client";

import { useLandingMotion } from "@/features/marketing/landing/v2/motion/use-landing-motion";

/** Cinematic 3D chrome — uses `.lp-hero-*` tokens in globals.css */
export function HeroPremiumChrome() {
  const { canLoop } = useLandingMotion();
  if (!canLoop) return null;

  return (
    <div className="lp-hero-chrome" aria-hidden>
      <div className="lp-hero-conic" />
      <div className="lp-hero-torus" />
      <div className="lp-hero-shard lp-hero-shard--a" />
      <div className="lp-hero-shard lp-hero-shard--b" />
      <div className="lp-hero-shard lp-hero-shard--c" />
      <div className="lp-hero-noise" />
      <div className="lp-hero-vignette" />
    </div>
  );
}
