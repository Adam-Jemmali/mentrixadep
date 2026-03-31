"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export function TutorStudioIllustration() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<SVGGElement>(null);
  const shimmerRef = useRef<SVGLineElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(containerRef.current, { opacity: 0 }, { opacity: 0.6, duration: 0.5 });
      const cards = cardsRef.current?.querySelectorAll("rect");
      cards?.forEach((c, i) => {
        gsap.fromTo(c, { x: -10 + i * 3 }, { x: i * 3, duration: 0.4, delay: 0.2 + i * 0.06, ease: "power2.out" });
      });
      gsap.to(shimmerRef.current, { opacity: 0.8, duration: 1.5, ease: "sine.inOut", yoyo: true, repeat: -1 });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute right-6 top-28 w-28 h-20 pointer-events-none hidden xl:block"
      aria-hidden
    >
      <svg viewBox="0 0 100 60" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g ref={cardsRef}>
          <rect x="2" y="8" width="50" height="32" rx="3" fill="#EFF6FF" stroke="#93C5FD" strokeWidth="1" />
          <rect x="6" y="12" width="50" height="32" rx="3" fill="#DBEAFE" stroke="#BFDBFE" strokeWidth="1" />
          <rect x="10" y="16" width="50" height="32" rx="3" fill="#BFDBFE" stroke="#60A5FA" strokeWidth="1" />
          <line ref={shimmerRef} x1="18" y1="24" x2="52" y2="24" stroke="#2563EB" strokeWidth="0.5" opacity={0.4} />
          <line x1="18" y1="30" x2="45" y2="30" stroke="#93C5FD" strokeWidth="0.5" opacity={0.5} />
        </g>
      </svg>
    </div>
  );
}
