"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export function ErrorIllustration() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cableRef = useRef<SVGGElement>(null);
  const triRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.5 });
      gsap.to(cableRef.current, { x: 2, duration: 1.5, ease: "sine.inOut", yoyo: true, repeat: -1 });
      gsap.to(triRef.current, { opacity: 0.7, duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: -1 });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="w-24 h-24 mx-auto mb-6 pointer-events-none" aria-hidden>
      <svg viewBox="0 0 80 80" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          ref={triRef}
          d="M40 20 L56 50 L24 50 Z"
          fill="#FEF3C7"
          stroke="#F59E0B"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <g ref={cableRef}>
          <rect x="25" y="52" width="6" height="8" rx="1" fill="#64748B" />
          <rect x="47" y="52" width="6" height="8" rx="1" fill="#64748B" />
          <path d="M31 60 Q40 50 49 60" stroke="#94A3B8" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}
