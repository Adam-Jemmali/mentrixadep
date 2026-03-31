"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export function QuestIllustration() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<SVGGElement>(null);
  const orbitRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(containerRef.current, { opacity: 0 }, { opacity: 0.7, duration: 0.8, delay: 0.3 });
      gsap.to(cardRef.current, { scale: 1.03, duration: 2.5, ease: "sine.inOut", yoyo: true, repeat: -1 });
      gsap.to(orbitRef.current, { rotation: 360, duration: 12, ease: "none", repeat: -1, transformOrigin: "center center" });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute right-6 top-24 w-24 h-24 pointer-events-none hidden xl:block"
      aria-hidden
    >
      <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g ref={orbitRef} transform="translate(50, 50)">
          <circle cx="0" cy="-25" r="6" fill="#93C5FD" opacity={0.7} />
          <circle cx="22" cy="12" r="5" fill="#BFDBFE" opacity={0.6} />
          <circle cx="-22" cy="12" r="5" fill="#60A5FA" opacity={0.5} />
        </g>
        <g ref={cardRef} transform="translate(35, 35)">
          <rect x="0" y="0" width="30" height="30" rx="4" fill="#EFF6FF" stroke="#93C5FD" strokeWidth="1.5" />
          <line x1="6" y1="10" x2="24" y2="10" stroke="#93C5FD" strokeWidth="1" strokeLinecap="round" />
          <line x1="6" y1="16" x2="20" y2="16" stroke="#BFDBFE" strokeWidth="1" strokeLinecap="round" />
          <line x1="6" y1="22" x2="16" y2="22" stroke="#BFDBFE" strokeWidth="1" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}
