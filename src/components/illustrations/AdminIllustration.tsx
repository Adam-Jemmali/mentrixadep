"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export function AdminIllustration() {
  const containerRef = useRef<HTMLDivElement>(null);
  const shieldRef = useRef<SVGGElement>(null);
  const cardsRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(containerRef.current, { opacity: 0 }, { opacity: 0.6, duration: 0.5, delay: 0.2 });
      gsap.to(shieldRef.current, { scale: 1.05, duration: 2, ease: "sine.inOut", yoyo: true, repeat: -1 });
      const cards = cardsRef.current?.querySelectorAll("rect");
      cards?.forEach((c, i) => {
        gsap.fromTo(c, { opacity: 0, y: 2 }, { opacity: 1, y: 0, duration: 0.25, delay: 0.3 + i * 0.06 });
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute right-6 top-24 w-24 h-24 pointer-events-none hidden lg:block"
      aria-hidden
    >
      <svg viewBox="0 0 80 80" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g ref={shieldRef} transform="translate(50, 15)">
          <path d="M0 20 L10 0 L20 5 L20 20 Q20 35 10 40 Q0 35 0 20 Z" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1.5" />
          <path d="M7 20 L10 16 L14 22 L14 28 L6 28 Z" fill="#2563EB" />
        </g>
        <g ref={cardsRef}>
          <rect x="10" y="45" width="60" height="8" rx="2" fill="#EFF6FF" stroke="#93C5FD" strokeWidth="0.5" />
          <rect x="10" y="55" width="60" height="8" rx="2" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="0.5" />
          <rect x="10" y="65" width="60" height="8" rx="2" fill="#BFDBFE" stroke="#60A5FA" strokeWidth="0.5" />
        </g>
      </svg>
    </div>
  );
}
