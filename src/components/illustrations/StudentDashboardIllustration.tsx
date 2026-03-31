"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export function StudentDashboardIllustration() {
  const containerRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<SVGGElement>(null);
  const flameRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(containerRef.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out", delay: 0.2 });
      const bars = barsRef.current?.querySelectorAll("rect");
      bars?.forEach((bar, i) => {
        gsap.fromTo(bar, { scaleY: 0 }, { scaleY: 1, duration: 0.4, delay: 0.4 + i * 0.08, ease: "power2.out", transformOrigin: "bottom" });
        gsap.to(bar, { scaleY: 1.05, duration: 2, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 1 + i * 0.2, transformOrigin: "bottom" });
      });
      gsap.to(flameRef.current, { scale: 1.1, duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: -1 });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute right-4 top-1/2 -translate-y-1/2 w-20 h-20 pointer-events-none hidden md:block opacity-60"
      aria-hidden
    >
      <svg viewBox="0 0 80 80" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="student-xp" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#93C5FD" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
        </defs>
        <g ref={barsRef}>
          <rect x="12" y="50" width="10" height="20" rx="2" fill="url(#student-xp)" opacity={0.8} />
          <rect x="34" y="38" width="10" height="32" rx="2" fill="url(#student-xp)" opacity={0.9} />
          <rect x="56" y="24" width="10" height="46" rx="2" fill="url(#student-xp)" />
        </g>
        <g ref={flameRef} transform="translate(68, 12)">
          <path d="M4 20 C4 8 10 4 10 4 C10 4 16 8 16 20 C16 28 10 36 10 36 C10 36 4 28 4 20 Z" fill="#F59E0B" opacity={0.9} />
        </g>
      </svg>
    </div>
  );
}
