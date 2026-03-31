"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const STEP_ICONS = {
  browse: (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect x="10" y="15" width="25" height="18" rx="2" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1.5" />
      <rect x="45" y="15" width="25" height="18" rx="2" fill="#BFDBFE" stroke="#93C5FD" strokeWidth="1.5" />
      <rect x="10" y="45" width="25" height="18" rx="2" fill="#EFF6FF" stroke="#93C5FD" strokeWidth="1.5" />
      <rect x="45" y="45" width="25" height="18" rx="2" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1.5" />
      <line x1="22" y1="22" x2="23" y2="26" stroke="#60A5FA" strokeWidth="1" />
      <line x1="22" y1="28" x2="30" y2="28" stroke="#60A5FA" strokeWidth="0.8" />
      <line x1="22" y1="32" x2="26" y2="32" stroke="#60A5FA" strokeWidth="0.8" />
    </svg>
  ),
  pay: (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect x="15" y="25" width="50" height="30" rx="3" fill="#EFF6FF" stroke="#93C5FD" strokeWidth="1.5" />
      <line x1="25" y1="38" x2="55" y2="38" stroke="#93C5FD" strokeWidth="1" strokeDasharray="4 2" />
      <path d="M30 18 L30 25 M50 18 L50 25" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
      <circle cx="40" cy="55" r="8" fill="#DBEAFE" stroke="#60A5FA" strokeWidth="1.5" />
      <path d="M36 55 L40 51 L44 55 L40 59 Z" fill="#2563EB" />
    </svg>
  ),
  live: (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <circle cx="25" cy="40" r="12" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1.5" />
      <circle cx="55" cy="40" r="12" fill="#BFDBFE" stroke="#93C5FD" strokeWidth="1.5" />
      <path
        d="M37 40 L43 36 L43 44 Z"
        fill="#2563EB"
      />
      <line x1="37" y1="40" x2="43" y2="40" stroke="#2563EB" strokeWidth="2" />
      <path d="M20 28 Q40 40 60 28" stroke="#93C5FD" strokeWidth="1.5" fill="none" opacity={0.8} />
    </svg>
  ),
  ai: (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect x="12" y="15" width="28" height="20" rx="2" fill="#EFF6FF" stroke="#93C5FD" strokeWidth="1.5" />
      <rect x="40" y="15" width="28" height="20" rx="2" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1.5" />
      <rect x="12" y="45" width="28" height="20" rx="2" fill="#BFDBFE" stroke="#93C5FD" strokeWidth="1.5" />
      <rect x="40" y="45" width="28" height="20" rx="2" fill="#EFF6FF" stroke="#93C5FD" strokeWidth="1.5" />
      {/* Sparkles */}
      <path d="M26 25 L27 28 L30 29 L27 30 L26 33 L25 30 L22 29 L25 28 Z" fill="#60A5FA" />
      <path d="M54 52 L55 54 L57 55 L55 56 L54 58 L53 56 L51 55 L53 54 Z" fill="#2563EB" />
    </svg>
  ),
} as const;

export type StepKey = keyof typeof STEP_ICONS;

export function StepIllustration({ step }: { step: StepKey }) {
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!elRef.current) return;
    ScrollTrigger.create({
      trigger: elRef.current,
      start: "top 90%",
      once: true,
      onEnter: () => {
        gsap.fromTo(
          elRef.current,
          { scale: 0.8, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.2)" }
        );
      },
    });
    return () => ScrollTrigger.getAll().forEach((t) => t.kill());
  }, []);

  return (
    <div ref={elRef} className="w-16 h-16 lg:w-20 lg:h-20 flex-shrink-0 step-illustration">
      {STEP_ICONS[step]}
    </div>
  );
}
