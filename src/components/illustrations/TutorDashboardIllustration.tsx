"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export function TutorDashboardIllustration() {
  const containerRef = useRef<HTMLDivElement>(null);
  const blocksRef = useRef<SVGGElement>(null);
  const checkRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(containerRef.current, { opacity: 0 }, { opacity: 0.6, duration: 0.5, delay: 0.2 });
      const blocks = blocksRef.current?.querySelectorAll("rect");
      blocks?.forEach((b, i) => {
        gsap.fromTo(b, { opacity: 0 }, { opacity: 1, duration: 0.3, delay: 0.3 + i * 0.05 });
        gsap.to(b, { scale: 1.02, duration: 2, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 0.8 + i * 0.1 });
      });
      gsap.fromTo(checkRef.current, { scale: 0 }, { scale: 1, duration: 0.3, delay: 0.6 });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute right-6 top-20 w-24 h-24 pointer-events-none hidden lg:block"
      aria-hidden
    >
      <svg viewBox="0 0 80 80" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g ref={blocksRef}>
          <rect x="10" y="15" width="18" height="12" rx="2" fill="#EFF6FF" stroke="#93C5FD" strokeWidth="1" />
          <rect x="10" y="32" width="18" height="12" rx="2" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1" />
          <rect x="10" y="49" width="18" height="12" rx="2" fill="#BFDBFE" stroke="#60A5FA" strokeWidth="1" />
        </g>
        <g ref={checkRef} transform="translate(48, 38)">
          <circle cx="12" cy="12" r="10" fill="#2563EB" />
          <path d="M7 12 L11 16 L18 8" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}
