"use client";

import { useEffect, useRef, useState } from "react";
import { useBouncingSprites } from "@/hooks/use-bouncing-sprites";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BubbleText } from "@/components/ui/bubble-text";
import { Typewriter } from "@/components/ui/typewriter";
import { useLowEndMode } from "@/lib/landing-perf";

const ICON_VERSION = "20260410";

const SIDES = [
  {
    role: "Mentrixer",
    title: "You came here to get better",
    points: [
      "Search your exact course. Every Guide you see is verified and available. No guessing. No waiting for a reply.",
      "You meet live. Screen share. Draw log functions :D.  Your Guide is here to prove what you know.",
      "Quest, duels, and your division rank track every improvement. The Mentrixer who books consistently does not plateau. They compound.",
    ],
    cta: "Claim my spot as a Mentrixer",
    href: "/auth/signup",
    tone: "blue",
  },
  {
    role: "Guide",
    title: "Your knowledge is worth more than you are charging for it",
    points: [
      "You set your availability, your subjects, your rate. You accept only the sessions you want. Nothing runs without your approval.",
      "Stripe deposits your earnings after every session. You teach and you get paid.",
      "Quest generates your session package. You review, adjust, and send.",
    ],
    cta: "Apply to teach on Mentrixa",
    href: "/auth/signup?role=tutor",
    tone: "violet",
  },
] as const;

const ArrowRight = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

const Check = ({ className = "" }: { className?: string }) => (
  <svg className={`h-4 w-4 shrink-0 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

function RoleIcon({ role, className = "" }: { role: "Mentrixer" | "Guide"; className?: string }) {
  return (
    <span className={cn("relative inline-block shrink-0", className)} aria-hidden>
      <Image
        src={role === "Mentrixer" ? `/icons/mentrixer.svg?v=${ICON_VERSION}` : `/icons/guide.svg?v=${ICON_VERSION}`}
        alt=""
        fill
        unoptimized
        className="object-contain"
        sizes="48px"
      />
    </span>
  );
}

function WatermarkRoleIcon({ role }: { role: "Mentrixer" | "Guide" }) {
  return (
    <span className="relative inline-block h-20 w-20 opacity-12 blur-[1px] brightness-125" aria-hidden>
      <Image
        src={role === "Mentrixer" ? `/icons/mentrixer.svg?v=${ICON_VERSION}` : `/icons/guide.svg?v=${ICON_VERSION}`}
        alt=""
        fill
        unoptimized
        className="object-contain"
        sizes="80px"
      />
    </span>
  );
}

const SIDES_BOUNCING_SIZES = [44, 44] as const;

function BouncingRoleIconsLayer({ disabled }: { disabled: boolean }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const iconRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useBouncingSprites(containerRef, iconRefs, SIDES_BOUNCING_SIZES, disabled || !mounted);

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0 z-[30] overflow-hidden" aria-hidden>
      {(["Mentrixer", "Guide"] as const).map((role, idx) => (
        <div
          key={role}
          ref={(el) => {
            iconRefs.current[idx] = el;
          }}
          className="absolute left-0 top-0 will-change-transform opacity-85 drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]"
          style={{ width: 44, height: 44 }}
        >
          <Image
            src={role === "Mentrixer" ? `/icons/mentrixer.svg?v=${ICON_VERSION}` : `/icons/guide.svg?v=${ICON_VERSION}`}
            alt=""
            width={44}
            height={44}
            unoptimized
            className="block h-full w-full object-contain"
            aria-hidden
          />
        </div>
      ))}
    </div>
  );
}

export function FourthStaticSidesCarouselContent() {
  const [selectedRole, setSelectedRole] = useState<"Mentrixer" | "Guide">("Mentrixer");
  const lowEndMode = useLowEndMode();
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    const update = () => setIsMobileViewport(window.innerWidth < 1024);
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

  const cinematicMode = !lowEndMode && !isMobileViewport;
  const desktopFloatingIcons = !isMobileViewport;

  return (
    <section id="fourthstatic" className="relative min-h-[84vh] overflow-hidden">
      <div className="relative min-h-[84vh] overflow-hidden">
        <Image
          src="/sequences-webp/4thstatic.webp"
          alt="Mentrixa session sides"
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-slate-950/45" aria-hidden />
        <BouncingRoleIconsLayer disabled={!desktopFloatingIcons} />

        <div className="relative z-10 mx-auto flex min-h-[84vh] w-full max-w-7xl flex-col px-5 py-8 md:px-8 md:py-10">
          <div className="mx-auto mb-5 max-w-3xl text-center">
            <h2 id="path" className="text-[clamp(22px,3.2vw,34px)] font-bold tracking-[-0.03em] text-white h-[40px]">
              {cinematicMode ? (
                <Typewriter text="Which side of the session are you on?" speed={50} waitTime={4000} />
              ) : (
                "Which side of the session are you on?"
              )}
            </h2>
            <p className="mt-2 text-[13px] text-slate-200/80">Choose a side and start there.</p>
          </div>

          <div className="mx-auto mb-5 inline-flex rounded-xl border border-white/20 bg-black/30 p-1 backdrop-blur-sm max-md:bg-black/60">
            {SIDES.map((side) => {
              const active = selectedRole === side.role;
              return (
                <button
                  key={`pick-${side.role}`}
                  type="button"
                  onClick={() => setSelectedRole(side.role)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all",
                    active ? "bg-white text-slate-900" : "text-slate-200 hover:bg-white/10"
                  )}
                >
                  <RoleIcon role={side.role} className={cn("h-3 w-3", active ? "" : "brightness-0 invert")} />
                  {cinematicMode ? (
                    <BubbleText text={side.role} activeColor="text-current" neighborColor="text-current" />
                  ) : (
                    <span>{side.role}</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="grid flex-1 items-start gap-4 md:grid-cols-2 md:gap-5">
            {SIDES.map((side) => {
              const isMentrixer = side.tone === "blue";
              const active = selectedRole === side.role;
              return (
                <article
                  key={side.role}
                  onClick={() => setSelectedRole(side.role)}
                  onMouseEnter={() => setSelectedRole(side.role)}
                  className={cn(
                    "relative cursor-pointer overflow-hidden rounded-2xl border p-6 backdrop-blur-sm transition-all duration-500",
                    active ? "scale-[1.01] ring-1 ring-white/30" : "scale-[0.98] opacity-80",
                    isMentrixer
                      ? "border-blue-400/35 bg-gradient-to-br from-blue-950/55 via-slate-950/45 to-slate-900/55 shadow-2xl shadow-blue-950/30 max-md:from-blue-950/72 max-md:via-slate-950/58 max-md:to-slate-900/65"
                      : "border-violet-400/35 bg-gradient-to-br from-violet-950/55 via-violet-900/45 to-slate-950/55 shadow-2xl shadow-violet-950/30 max-md:from-violet-950/72 max-md:via-violet-900/58 max-md:to-slate-950/65"
                  )}
                >
                  <div className="pointer-events-none absolute -right-8 -top-6 opacity-25">
                    <WatermarkRoleIcon role={side.role} />
                  </div>
                  <p
                    className={cn(
                      "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em]",
                      isMentrixer ? "text-blue-300" : "text-violet-300"
                    )}
                  >
                    <RoleIcon
                      role={side.role}
                      className="h-3 w-3 brightness-0 invert drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]"
                    />
                    {side.role}
                  </p>
                  <h3 className="mt-2 text-[19px] font-bold text-white h-[56px]">
                    {cinematicMode ? <Typewriter text={side.title} speed={40} waitTime={5000} /> : side.title}
                  </h3>
                  <ul className="mt-4 space-y-2.5 text-[13px] text-slate-200/95">
                    {side.points.map((point) => (
                      <li key={point} className="flex gap-2.5">
                        <Check className={isMentrixer ? "mt-0.5 text-blue-300" : "mt-0.5 text-violet-300"} />
                        {point}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={side.href}
                    className="mt-7 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-[#0B1120] transition-transform hover:-translate-y-0.5"
                  >
                    <RoleIcon role={side.role} className="h-3.5 w-3.5" />
                    {side.cta} <ArrowRight />
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
