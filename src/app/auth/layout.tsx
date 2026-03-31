"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import { countUp } from "@/lib/gsap";
import { AuthIllustration } from "@/components/illustrations";

const PHRASES = [
  "Your grades are not your ceiling.",
  "Every session makes the next one easier.",
  "The best tutors are already here.",
] as const;

export default function AuthLayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [index, setIndex] = useState(0);
  const phraseRef = useRef<HTMLDivElement | null>(null);
  const countRef = useRef<HTMLSpanElement | null>(null);

  const showLeftPanel = useMemo(
    () => !pathname.endsWith("/select-role"),
    [pathname],
  );

  useEffect(() => {
    if (!showLeftPanel) return;
    if (countRef.current) {
      countUp(countRef.current, 2400, 1.2);
    }
    const id = window.setInterval(() => {
      if (!phraseRef.current) return;
      const el = phraseRef.current;
      gsap.to(el, {
        y: -40,
        opacity: 0,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => {
          setIndex((prev) => (prev + 1) % PHRASES.length);
          gsap.fromTo(
            el,
            { y: 40, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.4, ease: "power3.out" },
          );
        },
      });
    }, 3200);
    return () => window.clearInterval(id);
  }, [showLeftPanel]);

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#FAFAFA]">
      {showLeftPanel && (
        <div className="hidden lg:flex flex-col justify-between p-12 bg-slate-900 text-white relative overflow-hidden">
          <div className="text-sm font-semibold tracking-[-0.03em]">
            
          </div>

          <div className="mt-8 max-w-xs">
            <div
              ref={phraseRef}
              className="font-semibold leading-tight"
              style={{
                fontSize: "clamp(22px,2.5vw,38px)",
                letterSpacing: "-0.03em",
              }}
            >
              {PHRASES[index]}
            </div>
          </div>

          <div className="mt-8 text-sm text-slate-400">
            <span
              ref={countRef}
              className="xp-number text-white font-semibold mr-1"
            >
              0
            </span>
            sessions completed
          </div>

          <div
            className="absolute top-0 right-0 h-full w-px"
            style={{
              background:
                "linear-gradient(to bottom, transparent, rgba(255,255,255,0.06), transparent)",
            }}
          />
          <AuthIllustration />
        </div>
      )}

      <div className="flex items-center justify-center p-8 lg:p-16 bg-[#FAFAFA]">
        <div
          className="max-w-sm w-full space-y-4"
          id="auth-form-wrapper"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

