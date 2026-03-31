"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export function DivisionIllustration() {
  const containerRef = useRef<HTMLDivElement>(null);
  const podiumRef = useRef<SVGGElement>(null);
  const glowRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const root = containerRef.current;
    const ctx = gsap.context(() => {
      gsap.fromTo(root, { opacity: 0, y: 6 }, { opacity: 0.6, y: 0, duration: 0.5, delay: 0.2 });
      if (glowRef.current) {
        gsap.to(glowRef.current, { opacity: 0.6, duration: 2, ease: "sine.inOut", yoyo: true, repeat: -1 });
      }
      const firstPodium = podiumRef.current?.children[0];
      if (firstPodium) {
        gsap.to(firstPodium, { y: -2, duration: 1.5, ease: "sine.inOut", yoyo: true, repeat: -1 });
      }
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute right-6 top-20 w-28 h-28 pointer-events-none hidden lg:block"
      aria-hidden
    >
      <svg viewBox="0 0 100 80" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="division-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FCD34D" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
        </defs>
        <g ref={glowRef} opacity={0.4}>
          <circle cx="50" cy="25" r="18" fill="#2563EB" />
        </g>
        <g ref={podiumRef}>
          <rect x="15" y="45" width="20" height="25" rx="2" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1" />
          <rect x="38" y="35" width="24" height="35" rx="2" fill="#BFDBFE" stroke="#60A5FA" strokeWidth="1" />
          <rect x="63" y="50" width="22" height="20" rx="2" fill="#EFF6FF" stroke="#93C5FD" strokeWidth="1" />
          <circle cx="50" cy="18" r="8" fill="url(#division-gold)" stroke="#D97706" strokeWidth="1" />
        </g>
      </svg>
    </div>
  );
}
