"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export function AuthIllustration() {
  const containerRef = useRef<HTMLDivElement>(null);
  const doorRef = useRef<SVGGElement>(null);
  const lightRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        lightRef.current,
        { opacity: 0.4 },
        { opacity: 0.9, duration: 2, ease: "sine.inOut", yoyo: true, repeat: -1 }
      );
      gsap.fromTo(
        doorRef.current,
        { x: -2 },
        { x: 2, duration: 3, ease: "sine.inOut", yoyo: true, repeat: -1 }
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="absolute bottom-24 right-12 w-32 h-32 opacity-40" aria-hidden>
      <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="auth-glow">
            <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
          </radialGradient>
        </defs>
        <g ref={lightRef}>
          <circle cx="50" cy="50" r="35" fill="url(#auth-glow)" />
        </g>
        <g ref={doorRef} transform="translate(30, 25)">
          <rect x="0" y="0" width="40" height="55" rx="2" fill="#334155" stroke="#64748B" strokeWidth="1" />
          <circle cx="35" cy="28" r="2" fill="#94A3B8" />
          <path d="M15 40 L25 40 L25 50 L15 50 Z" fill="#475569" stroke="#64748B" strokeWidth="0.5" />
        </g>
        <path d="M25 80 L25 25 L75 25 L75 80" stroke="#64748B" strokeWidth="1" fill="none" opacity={0.5} />
      </svg>
    </div>
  );
}
