"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export function VideoCallIllustration() {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<SVGGElement>(null);
  const tilesRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const root = containerRef.current;
    const ctx = gsap.context(() => {
      gsap.fromTo(root, { opacity: 0 }, { opacity: 0.5, duration: 0.6 });
      if (waveRef.current) {
        gsap.to(waveRef.current, {
          scaleX: 1.2,
          duration: 1.2,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          transformOrigin: "center",
        });
      }
      const firstTile = tilesRef.current?.children[0];
      if (firstTile) {
        gsap.to(firstTile, { opacity: 0.9, duration: 1.5, ease: "sine.inOut", yoyo: true, repeat: -1 });
      }
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full pointer-events-none flex items-center justify-center"
      aria-hidden
    >
      <svg viewBox="0 0 120 80" className="w-32 h-24 opacity-50" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g ref={tilesRef}>
          <rect x="10" y="10" width="45" height="30" rx="4" fill="#1E293B" stroke="#475569" strokeWidth="1" />
          <rect x="65" y="40" width="45" height="30" rx="4" fill="#334155" stroke="#64748B" strokeWidth="1" />
        </g>
        <g ref={waveRef} transform="translate(60, 40)">
          <path d="M-20 0 Q-10 -5 0 0 T20 0" stroke="#2563EB" strokeWidth="2" fill="none" strokeLinecap="round" opacity={0.6} />
          <path d="M-20 0 Q-10 5 0 0 T20 0" stroke="#60A5FA" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity={0.4} />
        </g>
      </svg>
    </div>
  );
}
