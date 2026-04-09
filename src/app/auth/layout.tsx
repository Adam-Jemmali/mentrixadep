"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { gsap } from "gsap";
import { MentrixaLogoMark } from "@/components/mentrixa-logo";
import { MENTRIXA_LOGO_PNG } from "@/lib/mentrixa-brand";

const PHRASES = [
  "Your grades are not your ceiling.",
  "Every session makes the next one easier.",
  "The best Guides are already here.",
] as const;

export default function AuthLayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [index, setIndex] = useState(0);
  const phraseRef = useRef<HTMLDivElement | null>(null);

  const isSelectRole = pathname.endsWith("/select-role");
  const showLeftPanel = useMemo(() => !isSelectRole, [isSelectRole]);

  useEffect(() => {
    if (!showLeftPanel) return;
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
          <div className="relative z-10 flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 group">
              <MentrixaLogoMark size="md" className="opacity-95 group-hover:opacity-100 transition-opacity" />
              <span className="text-[15px] font-bold tracking-[-0.04em] text-white">Mentrixa</span>
            </Link>
          </div>

          <div className="relative z-10 mt-8 max-w-xs flex-1 flex flex-col justify-center">
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

         

          <div
            className="absolute top-0 right-0 h-full w-px z-10"
            style={{
              background:
                "linear-gradient(to bottom, transparent, rgba(255,255,255,0.06), transparent)",
            }}
          />

          {/* 3D chrome + large logo — no extra icons */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <div className="absolute left-1/2 top-[28%] w-[min(100vw,480px)] h-[min(100vw,480px)] -translate-x-1/2 -translate-y-1/2">
              <div
                className="h-full w-full rounded-full opacity-30 mx-auth-glow-spin"
                style={{
                  background:
                    "conic-gradient(from 0deg, rgba(59,130,246,0.45), transparent, rgba(99,102,241,0.38), transparent)",
                  filter: "blur(52px)",
                }}
              />
            </div>
            <div className="absolute right-[-10%] bottom-[8%] mx-perspective">
              <div className="mx-auth-monolith mx-auth-monolith-spin">
                <Image
                  src={MENTRIXA_LOGO_PNG}
                  alt=""
                  width={280}
                  height={280}
                  className="object-contain opacity-[0.22]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className={cn(
          "flex items-center justify-center bg-[#FAFAFA]",
          isSelectRole ? "min-h-screen p-4 sm:p-6 lg:p-8" : "p-8 lg:p-16",
        )}
      >
        <div
          className={cn("w-full space-y-4", isSelectRole ? "max-w-6xl" : "max-w-sm")}
          id="auth-form-wrapper"
        >
          <div className="flex justify-center pb-1 auth-logo-slot">
            <Link
              href="/"
              className="rounded-xl outline-none ring-offset-2 ring-offset-[#FAFAFA] focus-visible:ring-2 focus-visible:ring-blue-500/40"
            >
              <MentrixaLogoMark size={isSelectRole ? "md" : "lg"} />
            </Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
