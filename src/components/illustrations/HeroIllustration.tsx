"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export function HeroIllustration() {
  const containerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<SVGGElement>(null);
  const bulbRef = useRef<SVGGElement>(null);
  const waveRef = useRef<SVGGElement>(null);
  const particlesRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      // Entrance animation
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, x: 40 },
        { opacity: 0.9, x: 0, duration: 1.2, ease: "power3.out", delay: 1.2 },
      );
      // Floating animation for main shapes
      gsap.to(bookRef.current, {
        y: -8,
        duration: 3,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
      gsap.to(bulbRef.current, {
        y: -6,
        duration: 2.5,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: 0.5,
      });
      gsap.to(waveRef.current, {
        y: -4,
        duration: 2.8,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: 0.2,
      });
      // Particle drift
      const particles = particlesRef.current?.querySelectorAll("circle");
      particles?.forEach((p, i) => {
        gsap.to(p, {
          y: -12 - Math.random() * 8,
          opacity: 0.6,
          duration: 4 + i * 0.5,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          delay: i * 0.3,
        });
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute right-0 top-1/2 -translate-y-1/2 w-full max-w-md lg:max-w-lg h-80 lg:h-96 hidden xl:block pointer-events-none"
      aria-hidden
    >
      <svg
        viewBox="0 0 400 320"
        className="w-full h-full opacity-90"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Soft gradient background blob */}
        <defs>
          <linearGradient id="hero-blue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563EB" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#93C5FD" stopOpacity={0.08} />
          </linearGradient>
          <linearGradient id="hero-accent" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
        </defs>
        <ellipse cx="280" cy="160" rx="120" ry="140" fill="url(#hero-blue)" />
        {/* Open book */}
        <g ref={bookRef} transform="translate(180, 100)">
          <path
            d="M20 80 L20 25 Q20 10 38 10 L70 10 L70 80 Q45 80 20 80 Z"
            fill="#DBEAFE"
            stroke="#93C5FD"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M120 80 L120 25 Q120 10 102 10 L70 10 L70 80 Q95 80 120 80 Z"
            fill="#BFDBFE"
            stroke="#93C5FD"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <line x1="70" y1="10" x2="70" y2="80" stroke="#93C5FD" strokeWidth="1.5" />
          <line x1="28" y1="35" x2="62" y2="35" stroke="#93C5FD" strokeWidth="1" strokeLinecap="round" />
          <line x1="28" y1="48" x2="62" y2="48" stroke="#93C5FD" strokeWidth="1" strokeLinecap="round" />
          <line x1="28" y1="61" x2="52" y2="61" stroke="#93C5FD" strokeWidth="1" strokeLinecap="round" />
          <line x1="78" y1="35" x2="112" y2="35" stroke="#BFDBFE" strokeWidth="1" strokeLinecap="round" />
          <line x1="78" y1="48" x2="112" y2="48" stroke="#BFDBFE" strokeWidth="1" strokeLinecap="round" />
        </g>
        {/* Lightbulb / idea */}
        <g ref={bulbRef} transform="translate(80, 60)">
          <circle cx="40" cy="32" r="18" fill="#EFF6FF" stroke="#93C5FD" strokeWidth="1.5" />
          <path
            d="M28 32 L32 28 M52 32 L48 28 M40 14 L40 18 M40 46 L40 50"
            stroke="#60A5FA"
            strokeWidth="1"
            strokeLinecap="round"
          />
          <rect x="36" y="50" width="8" height="6" rx="1" fill="#93C5FD" />
        </g>
        {/* Waveform / connection */}
        <g ref={waveRef} transform="translate(280, 180)">
          <path
            d="M0 20 Q15 5 30 20 T60 20 T90 20"
            stroke="url(#hero-accent)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M0 35 Q15 20 30 35 T60 35 T90 35"
            stroke="#93C5FD"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            opacity={0.7}
          />
        </g>
        {/* Floating particles */}
        <g ref={particlesRef}>
          <circle cx="50" cy="220" r="3" fill="#93C5FD" opacity={0.6} />
          <circle cx="350" cy="80" r="2" fill="#60A5FA" opacity={0.5} />
          <circle cx="320" cy="250" r="2.5" fill="#BFDBFE" opacity={0.6} />
          <circle cx="120" cy="260" r="2" fill="#93C5FD" opacity={0.4} />
          <circle cx="380" cy="150" r="2" fill="#2563EB" opacity={0.4} />
        </g>
      </svg>
    </div>
  );
}
