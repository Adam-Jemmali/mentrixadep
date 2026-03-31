"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export function CTAIllustration() {
  const containerRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<SVGGElement>(null);
  const barsRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        arrowRef.current,
        { y: 4 },
        { y: -4, duration: 2, ease: "sine.inOut", yoyo: true, repeat: -1 }
      );
      const bars = barsRef.current?.querySelectorAll("rect");
      bars?.forEach((bar, i) => {
        gsap.fromTo(
          bar,
          { scaleY: 0.3 },
          {
            scaleY: 0.5 + (i * 0.15),
            duration: 1,
            delay: i * 0.1,
            ease: "power2.out",
            transformOrigin: "bottom center",
          }
        );
        gsap.to(bar, {
          scaleY: 0.6 + (i * 0.1),
          duration: 1.5,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          delay: 1 + i * 0.2,
          transformOrigin: "bottom center",
        });
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="w-24 h-24 lg:w-32 lg:h-32 flex-shrink-0" aria-hidden>
      <svg viewBox="0 0 80 80" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="cta-grad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#93C5FD" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
        </defs>
        <g ref={barsRef}>
          <rect x="18" y="45" width="8" height="25" rx="2" fill="url(#cta-grad)" opacity={0.6} />
          <rect x="36" y="35" width="8" height="35" rx="2" fill="url(#cta-grad)" opacity={0.8} />
          <rect x="54" y="20" width="8" height="50" rx="2" fill="url(#cta-grad)" />
        </g>
        <g ref={arrowRef} transform="translate(40, 15)">
          <path
            d="M0 20 L8 12 L8 16 L16 16 L16 8 L24 8"
            stroke="#2563EB"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M20 4 L24 8 L20 12" stroke="#2563EB" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}
