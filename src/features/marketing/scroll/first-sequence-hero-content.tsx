"use client";

import { useEffect, useLayoutEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/shared/core/utils";
import { ParticleTextEffect } from "@/shared/ui/particle-text-effect";
import { GooeyText } from "@/shared/ui/gooey-text-morphing";
import { BubbleText } from "@/shared/ui/bubble-text";
import { Typewriter } from "@/shared/ui/typewriter";
import ParticleAnimation from "@/shared/ui/particle-animation";
import { useLowEndMode, useSectionScrollProgress } from "@/features/marketing/landing-perf";
import { submitOnboardingRequest } from "@/features/registration/onboarding-request-client";

const ICON_VERSION = "20260718";

const ArrowRight = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

function RoleIcon({
  role,
  className = "",
  priority = false,
}: {
  role: "mentrixer" | "guide";
  className?: string;
  priority?: boolean;
}) {
  return (
    <span className={cn("relative inline-block shrink-0", className)} aria-hidden>
      <Image
        src={role === "mentrixer" ? `/icons/mentrixer.svg?v=${ICON_VERSION}` : `/icons/guide.svg?v=${ICON_VERSION}`}
        alt=""
        width={48}
        height={48}
        priority={priority}
        unoptimized
        className="size-full object-contain"
        sizes="48px"
      />
    </span>
  );
}

function BouncingRoleIcons({ disabled }: { disabled: boolean }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const iconRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [iconsReady, setIconsReady] = useState(false);

  useEffect(() => {
    setIconsReady(true);
  }, []);

  useLayoutEffect(() => {
    if (disabled) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const container = containerRef.current;
    const icons = iconRefs.current.filter(Boolean) as HTMLDivElement[];
    if (!container || icons.length === 0) return;

    type IconParticle = {
      el: HTMLDivElement;
      x: number;
      y: number;
      vx: number;
      vy: number;
      w: number;
      h: number;
    };

    const randomVelocity = () => {
      const speed = 85 + Math.random() * 105;
      return (Math.random() > 0.5 ? 1 : -1) * speed;
    };

    const randomNudge = () => (Math.random() - 0.5) * 26;

    const normalizeSpeed = (p: IconParticle) => {
      const speed = Math.hypot(p.vx, p.vy) || 1;
      const minSpeed = 90;
      const maxSpeed = 180;
      const target = Math.max(minSpeed, Math.min(maxSpeed, speed));
      const scale = target / speed;
      p.vx *= scale;
      p.vy *= scale;
    };

    const particles: IconParticle[] = icons.map((el) => ({
      el,
      x: 0,
      y: 0,
      vx: randomVelocity(),
      vy: randomVelocity(),
      w: 0,
      h: 0,
    }));

    const setInitialPositions = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      for (const p of particles) {
        p.w = p.el.offsetWidth || 44;
        p.h = p.el.offsetHeight || 44;
        const maxX = Math.max(width - p.w, 0);
        const maxY = Math.max(height - p.h, 0);
        p.x = Math.random() * maxX;
        p.y = Math.random() * maxY;
        normalizeSpeed(p);
        p.el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
      }
    };

    setInitialPositions();

    let frameId = 0;
    let lastTs = performance.now();
    let ro: ResizeObserver | null = null;
    const minFrameMs = 1000 / 30;

    const step = (ts: number) => {
      if (document.hidden) {
        frameId = window.requestAnimationFrame(step);
        return;
      }
      if (ts - lastTs < minFrameMs) {
        frameId = window.requestAnimationFrame(step);
        return;
      }
      const dt = Math.min((ts - lastTs) / 1000, 0.033);
      lastTs = ts;
      const width = container.clientWidth;
      const height = container.clientHeight;

      for (const p of particles) {
        p.w = p.el.offsetWidth || 44;
        p.h = p.el.offsetHeight || 44;
        const maxX = Math.max(width - p.w, 0);
        const maxY = Math.max(height - p.h, 0);

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        if (p.x <= 0) {
          p.x = 0;
          p.vx = Math.abs(p.vx);
          p.vy += randomNudge();
        } else if (p.x >= maxX) {
          p.x = maxX;
          p.vx = -Math.abs(p.vx);
          p.vy += randomNudge();
        }

        if (p.y <= 0) {
          p.y = 0;
          p.vy = Math.abs(p.vy);
          p.vx += randomNudge();
        } else if (p.y >= maxY) {
          p.y = maxY;
          p.vy = -Math.abs(p.vy);
          p.vx += randomNudge();
        }

        normalizeSpeed(p);

        p.el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
      }

      frameId = window.requestAnimationFrame(step);
    };

    frameId = window.requestAnimationFrame(step);
    const handleResize = () => setInitialPositions();
    window.addEventListener("resize", handleResize, { passive: true });
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        setInitialPositions();
      });
      ro.observe(container);
    }
    // First paint can still report 0×0 before the scroll-sequence shell lays out — re-seed next frame.
    requestAnimationFrame(() => setInitialPositions());

    return () => {
      window.removeEventListener("resize", handleResize);
      window.cancelAnimationFrame(frameId);
      ro?.disconnect();
    };
  }, [disabled, iconsReady]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-x-0 bottom-0 top-20 z-[25] overflow-hidden sm:top-24"
      aria-hidden
    >
      {[
        { role: "mentrixer" as const, size: "h-11 w-11 opacity-90" },
        { role: "guide" as const, size: "h-11 w-11 opacity-90" },
        { role: "mentrixer" as const, size: "h-10 w-10 opacity-80" },
        { role: "guide" as const, size: "h-10 w-10 opacity-80" },
        { role: "mentrixer" as const, size: "h-12 w-12 opacity-75" },
        { role: "guide" as const, size: "h-12 w-12 opacity-75" },
      ].map((icon, idx) => (
        <div
          key={`${icon.role}-${idx}`}
          ref={(el) => {
            iconRefs.current[idx] = el;
          }}
          className={cn(
            "absolute left-0 top-0 will-change-transform rounded-full shadow-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]",
            icon.size,
          )}
        >
          <RoleIcon role={icon.role} className={icon.size} priority={idx === 0} />
        </div>
      ))}
    </div>
  );
}

// Letter-by-letter reveal component - memoized for scroll-based animation

type WaitlistRole = "student" | "tutor";

const ROLE_ONBOARDING_COPY: Record<
  WaitlistRole,
  {
    headline: string;
    cta: string;
    slides: [string, string, string];
  }
> = {
  student: {
    headline: "Climb your courses as a Mentrixer",
    cta: "Start Mentrixer climb",
    slides: ["Rank your progress", "Spot weak topics fast", "Book a Guide when stuck"],
  },
  tutor: {
    headline: "Lead wins as a Guide",
    cta: "Start Guide climb",
    slides: ["Coach high-impact sessions", "Deliver Quest-powered packages", "Grow your tutoring arena"],
  },
};


export function FirstSequenceHeroContent() {
  const router = useRouter();
  const progress = useSectionScrollProgress("firstseq", 0.01);
  const lowEndMode = useLowEndMode();
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistRole, setWaitlistRole] = useState<WaitlistRole>("student");
  const [waitlistMsg, setWaitlistMsg] = useState<string | null>(null);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);
  const roleCopy = ROLE_ONBOARDING_COPY[waitlistRole];
  const effectiveProgress = isMobileViewport ? 1 : progress;
  const revealLeft = Math.min(1, Math.max(0.2, effectiveProgress * 1.25));
  const revealRight = Math.min(1, Math.max(0.15, (effectiveProgress - 0.08) * 1.3));
  const headlineY = 26 - effectiveProgress * 54;
  const lineAOpacity = Math.min(1, 0.3 + effectiveProgress * 1.5);
  // Mobile should match the current simplified desktop marketing presentation:
  // no particle backdrop, no bouncing icon layer, no morph/particle text effects.
  const cinematicMode = !lowEndMode && !isMobileViewport;
  /** Bouncing icons are cheap; keep them on desktop even in low-end mode (particles stay off). */
  const desktopFloatingIcons = !isMobileViewport;

  useEffect(() => {
    const update = () => setIsMobileViewport(window.innerWidth < 1024);
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (!cinematicMode) return;
    const id = window.setInterval(() => {
      setSlideIdx((n) => (n + 1) % roleCopy.slides.length);
    }, 3500);
    return () => window.clearInterval(id);
  }, [cinematicMode, roleCopy.slides.length]);

  useEffect(() => {
    setSlideIdx(0);
  }, [waitlistRole]);

  useEffect(() => {
    router.prefetch("/auth/signup");
    router.prefetch("/auth/signup?role=tutor");
    router.prefetch("/try");
  }, [router]);

  const submitWaitlist = useCallback(async () => {
    setWaitlistMsg(null);
    const email = waitlistEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setWaitlistMsg("Enter a valid email.");
      return;
    }
    setWaitlistLoading(true);
    try {
      const result = await submitOnboardingRequest(email, waitlistRole);
      if (result.outcome === "error" || result.outcome === "rejected") {
        setWaitlistMsg(result.error ?? "Could not start access request.");
      } else if (result.outcome === "approved") {
        setWaitlistMsg(result.message ?? `You're already approved. Complete signup now.`);
      } else {
        setWaitlistMsg(result.message ?? `You're in onboarding. Check your email for next steps.`);
      }
    } catch {
      setWaitlistMsg("Could not start access request.");
    } finally {
      setWaitlistLoading(false);
    }
  }, [waitlistEmail, waitlistRole]);

  return (
    <div
      className="relative flex h-full min-h-0 w-full min-w-0 flex-col items-start justify-center overflow-hidden px-4 pb-8 pt-14 sm:px-5 sm:pt-16 md:items-center md:pt-14 md:pb-8 lg:pt-16 lg:pb-6"
    >
      {cinematicMode ? <ParticleAnimation className="absolute inset-0 z-0 opacity-30" /> : null}
      {!isMobileViewport ? <BouncingRoleIcons disabled={!desktopFloatingIcons} /> : null}
      {/* Desktop: tagline floats over the hero art. Mobile: rendered in-flow below so CTAs never overlap. */}
      {!isMobileViewport ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-64 z-[100] block px-5 text-center md:top-80 lg:top-[26rem]"
          style={{
            opacity: Math.min(1, revealLeft * 1.5),
            willChange: "opacity, transform",
          }}
        >
          <div className="mx-auto mt-2 h-40 w-full max-w-4xl">
            {cinematicMode ? (
              <GooeyText
                texts={["Get unstuck.", "Stay ahead.", "Prove you improved."]}
                morphTime={2.5}
                cooldownTime={3}
                textClassName="text-2xl md:text-4xl font-black text-white drop-shadow-[0_8px_8px_rgba(0,0,0,0.9)] italic tracking-tighter"
                className="h-full"
              />
            ) : (
              <p className="text-2xl font-black italic tracking-tighter text-white drop-shadow-[0_8px_8px_rgba(0,0,0,0.9)] md:text-4xl">
                Get unstuck. Stay ahead. Prove you improved.
              </p>
            )}
          </div>
        </div>
      ) : null}

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col px-0 sm:px-5">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 lg:grid lg:max-w-[90rem] lg:grid-cols-[1fr_1fr] lg:items-start lg:gap-12 lg:px-8 xl:px-16">
          <div className="relative mx-auto max-w-2xl text-center lg:mx-0 lg:max-w-lg lg:text-left lg:pt-16" style={{ 
            opacity: revealLeft,
            willChange: 'opacity, transform',
          }}>
            {isMobileViewport ? (
              <div className="mb-5 px-1 pt-1">
                <p className="text-[clamp(1.375rem,5.5vw,1.75rem)] font-black italic leading-snug tracking-tighter text-white drop-shadow-[0_6px_14px_rgba(0,0,0,0.85)]">
                  Get unstuck. Stay ahead. Prove you improved.
                </p>
                <p className="mt-2 text-sm text-white/75 leading-relaxed">
                  Book a live expert. Practice built from a reviewed question bank, not generated on the fly. Climb your subject&apos;s leaderboard.
                </p>
              </div>
            ) : null}

            <div 
              style={{
                opacity: lineAOpacity,
                transform: isMobileViewport
                  ? undefined
                  : `translate3d(0, ${headlineY * 1.1}px, 0)`,
              }}
              className="space-y-4"
            >
              <div className={cn(isMobileViewport ? "hidden" : "min-h-[60px] md:min-h-[40px]")}>
                {/* GooeyText sits in the absolute layer above on lg+ */}
              </div>
            </div>

            <div className={cn("flex flex-col justify-center gap-3 sm:flex-row lg:mt-6 lg:justify-start lg:gap-4", isMobileViewport ? "mt-1" : "mt-5")}>
              <Link
                href="/auth/signup"
                className="lp-cta-pulse group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#0B1120] shadow-lg shadow-indigo-500/10 transition-all hover:-translate-y-0.5 hover:shadow-indigo-500/20 sm:w-auto sm:px-7 sm:py-3.5"
              >
                Start for free
                <span className="group-hover:translate-x-0.5 transition-transform">
                  <ArrowRight />
                </span>
              </Link>
              <Link
                href="/try"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-medium text-slate-100 transition-colors hover:bg-white/[0.06] sm:w-auto sm:px-7 sm:py-3.5"
              >
                Try a practice quest
              </Link>
              <Link
                href="/auth/signup?role=tutor"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-sm font-medium text-white/95 transition-colors hover:bg-white/[0.04] sm:w-auto sm:px-7 sm:py-3.5"
              >
                <RoleIcon role="guide" className="h-3.5 w-3.5 brightness-0 invert drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]" />
                Become a Guide
              </Link>
            </div>
          </div>

          <div
            className="w-full pt-2 sm:pt-4 lg:pt-16"
            style={{ opacity: revealRight, transform: `translateY(${(1 - revealRight) * 16}px)` }}
          >
            <div id="waitlist" className="relative mx-auto max-w-xl overflow-hidden rounded-2xl border border-white/15 bg-slate-950/78 p-2.5 text-left shadow-xl shadow-violet-950/45 backdrop-blur-md sm:p-3 lg:ml-auto lg:w-full lg:max-w-[22rem] xl:-mr-12">
  
              <h3 className="text-[15px] font-semibold tracking-tight text-white sm:text-base">
                <span className="block h-6">
                  {cinematicMode ? (
                    <ParticleTextEffect
                      key={JSON.stringify([roleCopy.headline.toUpperCase()])}
                      words={[roleCopy.headline.toUpperCase()]}
                      className="h-full w-full opacity-95"
                      tone="onDark"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-white">
                      {roleCopy.headline.toUpperCase()}
                    </span>
                  )}
                </span>
              </h3>

              <div className="mt-2.5 grid gap-2 lg:grid-cols-[1fr_1.2fr] lg:gap-2">
                <div className="min-h-[72px] rounded-xl border border-white/10 bg-black/55 p-2">
                  {roleCopy.slides.map((title, i) => (
                    <div
                      key={title}
                      className={cn(
                        "transition-all duration-300",
                        i === slideIdx ? "opacity-100 translate-x-0" : "hidden opacity-0 translate-x-2",
                      )}
                    >
                      <p className="text-sm font-semibold text-white">{title}</p>
                      
                    </div>
                  ))}
                  <div className="mt-2 flex gap-1.5">
                    {roleCopy.slides.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSlideIdx(i)}
                        className={cn(
                          "h-1.5 rounded-full transition-all",
                          i === slideIdx ? "w-7 bg-blue-500" : "w-3 bg-white/30",
                        )}
                        aria-label={`Onboarding slide ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/55 p-2">
                  <input
                    type="email"
                    value={waitlistEmail}
                    onChange={(e) => setWaitlistEmail(e.target.value)}
                    placeholder="your email"
                    className="w-full rounded-lg border border-white/20 bg-white/95 px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-500"
                  />
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setWaitlistRole("student")}
                      className={cn(
                        "inline-flex flex-nowrap min-h-8 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium",
                        waitlistRole === "student" ? "bg-white text-slate-900" : "bg-white/10 text-white",
                      )}
                    >
                      <RoleIcon role="mentrixer" className={cn("h-3 w-3", waitlistRole === "student" ? "" : "brightness-0 invert")} />
                      <BubbleText text="Mentrixer" activeColor="text-blue-500" neighborColor="text-blue-400" className="text-current whitespace-nowrap" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setWaitlistRole("tutor")}
                      className={cn(
                        "inline-flex flex-nowrap min-h-8 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium",
                        waitlistRole === "tutor" ? "bg-white text-slate-900" : "bg-white/10 text-white",
                      )}
                    >
                      <RoleIcon role="guide" className={cn("h-3 w-3", waitlistRole === "tutor" ? "" : "brightness-0 invert")} />
                      <BubbleText text="Guide" activeColor="text-purple-500" neighborColor="text-purple-400" className="text-current whitespace-nowrap" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => void submitWaitlist()}
                    disabled={waitlistLoading}
                    className="mt-2.5 inline-flex min-h-8 w-full items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-60"
                  >
                    {waitlistLoading ? (
                      "Submitting..."
                    ) : (
                      <span className="block min-h-5 w-full">
                        <Typewriter
                          key={roleCopy.cta}
                          text={roleCopy.cta}
                          speed={45}
                          initialDelay={0}
                          waitTime={1200}
                          deleteSpeed={28}
                          loop={true}
                          showCursor={false}
                          className="text-center text-sm font-semibold tracking-wide text-slate-900"
                        />
                      </span>
                    )}
                  </button>
                  {waitlistMsg ? <p className="mt-2 text-xs text-blue-200">{waitlistMsg}</p> : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
