"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ParticleTextEffect } from "@/components/ui/particle-text-effect";
import { GooeyText } from "@/components/ui/gooey-text-morphing";
import { Typewriter } from "@/components/ui/typewriter";
import { BubbleText } from "@/components/ui/bubble-text";
import ParticleAnimation from "@/components/ui/particle-animation";

const ICON_VERSION = "20260410";

const WAITLIST_SLIDES = [
  {
    title: "Early access",
   
  },
  {
    title: "Priority onboarding",
  
  },
  {
    title: "Launch updates",
   
  },
];

const ArrowRight = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

function RoleIcon({ role, className = "" }: { role: "mentrixer" | "guide"; className?: string }) {
  return (
    <Image
      src={role === "mentrixer" ? `/icons/mentrixer.svg?v=${ICON_VERSION}` : `/icons/guide.svg?v=${ICON_VERSION}`}
      alt=""
      width={16}
      height={16}
      unoptimized
      className={`block ${className}`}
      aria-hidden
    />
  );
}

function BouncingRoleIcons() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mentrixerRef = useRef<HTMLDivElement | null>(null);
  const guideRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const mentrixer = mentrixerRef.current;
    const guide = guideRef.current;
    if (!container || !mentrixer || !guide) return;

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
      const speed = 90 + Math.random() * 90;
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

    const particles: IconParticle[] = [
      {
        el: mentrixer,
        x: 0,
        y: 0,
        vx: randomVelocity(),
        vy: randomVelocity(),
        w: 0,
        h: 0,
      },
      {
        el: guide,
        x: 0,
        y: 0,
        vx: randomVelocity(),
        vy: randomVelocity(),
        w: 0,
        h: 0,
      },
    ];

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

    const step = (ts: number) => {
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

    return () => {
      window.removeEventListener("resize", handleResize);
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
      <div ref={mentrixerRef} className="absolute left-0 top-0 will-change-transform shadow-2xl rounded-full">
        <RoleIcon role="mentrixer" className="h-11 w-11 opacity-85" />
      </div>
      <div ref={guideRef} className="absolute left-0 top-0 will-change-transform shadow-2xl rounded-full">
        <RoleIcon role="guide" className="h-11 w-11 opacity-85" />
      </div>
    </div>
  );
}

// Letter-by-letter reveal component - memoized for scroll-based animation

type WaitlistRole = "student" | "tutor";


function useSequenceProgress(sequenceId: string) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastProgressRef = useRef(0);

  useEffect(() => {
    const update = () => {
      const section = document.getElementById(sequenceId);
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const scrollable = Math.max(section.scrollHeight - window.innerHeight, 1);
      const next = Math.min(Math.max(-rect.top / scrollable, 0), 1);
      
      // Only update if change > 0.01 threshold for fewer re-renders
      if (Math.abs(next - lastProgressRef.current) > 0.01) {
        lastProgressRef.current = next;
        setProgress(next);
      }
    };

    const handleScroll = () => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        update();
        rafRef.current = null;
      });
    };

    update();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [sequenceId]);

  return progress;
}
export function FirstSequenceHeroContent() {
  const progress = useSequenceProgress("firstseq");
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistRole, setWaitlistRole] = useState<WaitlistRole>("student");
  const [waitlistMsg, setWaitlistMsg] = useState<string | null>(null);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);
  const revealLeft = Math.min(1, Math.max(0.2, progress * 1.25));
  const revealRight = Math.min(1, Math.max(0.15, (progress - 0.08) * 1.3));
  const headlineY = 26 - progress * 54;
  const lineAOpacity = Math.min(1, 0.3 + progress * 1.5);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSlideIdx((n) => (n + 1) % WAITLIST_SLIDES.length);
    }, 3500);
    return () => window.clearInterval(id);
  }, []);

  const submitWaitlist = useCallback(async () => {
    setWaitlistMsg(null);
    const email = waitlistEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setWaitlistMsg("Enter a valid email.");
      return;
    }
    setWaitlistLoading(true);
    try {
      const res = await fetch("/api/waitlist/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: waitlistRole }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        approved?: boolean;
        error?: string;
        message?: string;
        status?: "pending" | "approved" | "rejected";
      };
      if (!res.ok) {
        if (json.status === "pending") {
          setWaitlistMsg("You have already applied to the waitlist. Please wait for an admin decision.");
        } else if (json.status === "rejected") {
          setWaitlistMsg("Your waitlist application was rejected. Contact support@mentrixa.one if you believe this is a mistake.");
        } else {
          setWaitlistMsg(json.error ?? "Could not join waitlist.");
        }
      } else if (json.approved) {
        setWaitlistMsg(json.message ?? "You already applied and are approved. You can sign up now.");
      } else {
        setWaitlistMsg(json.message ?? "You are on the waitlist. Check your email for confirmation.");
      }
    } catch {
      setWaitlistMsg("Could not join waitlist.");
    } finally {
      setWaitlistLoading(false);
    }
  }, [waitlistEmail, waitlistRole]);

  return (
    <div className="relative flex min-h-screen items-start justify-center overflow-hidden px-4 pb-8 pt-14 sm:px-5 sm:pt-16 md:items-center md:pt-14 md:pb-8 lg:pt-16 lg:pb-6" id="firstseq">
      <ParticleAnimation className="absolute inset-0 z-0 opacity-30" />
      <div className="hidden md:block">
        <BouncingRoleIcons />
      </div>
      <div
        className="pointer-events-none absolute inset-x-0 top-64 z-[100] block px-5 text-center md:top-80 lg:top-[26rem]"
        style={{ 
          opacity: Math.min(1, revealLeft * 1.5),
          willChange: 'opacity, transform',
        }}
      >
        <div className="mx-auto h-40 w-full max-w-4xl mt-2">
          <GooeyText 
            texts={[
              "Compete. Climb. Improve.", 
              "Meet live.", 
              "Book a Guide."
            ]} 
            morphTime={2.5}
            cooldownTime={3}
            textClassName="text-2xl md:text-4xl font-black text-white drop-shadow-[0_8px_8px_rgba(0,0,0,0.9)] italic tracking-tighter"
            className="h-full"
          />
        </div>
      </div>

      <div className="relative z-10 w-full px-0 sm:px-5">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 lg:grid lg:max-w-[90rem] lg:grid-cols-[1fr_1fr] lg:items-start lg:gap-12 lg:px-8 xl:px-16">
          <div className="relative mx-auto max-w-2xl text-center lg:mx-0 lg:max-w-lg lg:text-left lg:pt-16" style={{ 
            opacity: revealLeft,
            willChange: 'opacity, transform',
          }}>
            <div 
              style={{
                opacity: lineAOpacity,
                transform: `translate3d(0, ${headlineY * 1.1}px, 0)`,
              }}
              className="space-y-4"
            >
              <div className="min-h-[60px] md:min-h-[40px]">
                {/* GooeyText moved to laptop screen area above */}
              </div>
            </div>

            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row lg:mt-6 lg:justify-start lg:gap-4">
              <Link
                href="/auth/signup"
                className="lp-cta-pulse group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#0B1120] shadow-lg shadow-indigo-500/10 transition-all hover:-translate-y-0.5 hover:shadow-indigo-500/20 sm:w-auto sm:px-7 sm:py-3.5"
              >
                <RoleIcon role="mentrixer" className="h-3.5 w-3.5" />
                Become a Mentrixer
                <span className="group-hover:translate-x-0.5 transition-transform">
                  <ArrowRight />
                </span>
              </Link>
              <Link
                href="/auth/signup?role=tutor"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-medium text-slate-100 transition-colors hover:bg-white/[0.06] sm:w-auto sm:px-7 sm:py-3.5"
              >
                <RoleIcon role="guide" className="h-3.5 w-3.5" />
                Become a Guide
              </Link>
              <Link
                href="/try"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-sm font-medium text-white/95 transition-colors hover:bg-white/[0.04] sm:w-auto sm:px-7 sm:py-3.5"
              >
                Try a  Quest 
              </Link>
            </div>
          </div>

          <div
            className="w-full pt-2 sm:pt-4 lg:pt-16"
            style={{ opacity: revealRight, transform: `translateY(${(1 - revealRight) * 16}px)` }}
          >
            <div id="waitlist" className="relative mx-auto max-w-xl overflow-hidden rounded-2xl border border-white/15 bg-slate-950/78 p-2.5 text-left shadow-xl shadow-violet-950/45 backdrop-blur-md sm:p-3 lg:ml-auto lg:w-full lg:max-w-[22rem] xl:-mr-12">
  
              <h3 className="text-[15px] font-semibold tracking-tight text-white sm:text-base">
                <Typewriter text="Apply for early access" speed={70} waitTime={2500} cursorChar="_" />
              </h3>

              <div className="mt-2.5 grid gap-2 lg:grid-cols-[1fr_1.2fr] lg:gap-2">
                <div className="min-h-[72px] rounded-xl border border-white/10 bg-black/55 p-2">
                  {WAITLIST_SLIDES.map((s, i) => (
                    <div
                      key={s.title}
                      className={cn(
                        "transition-all duration-300",
                        i === slideIdx ? "opacity-100 translate-x-0" : "hidden opacity-0 translate-x-2",
                      )}
                    >
                      <p className="text-sm font-semibold text-white">{s.title}</p>
                      
                    </div>
                  ))}
                  <div className="mt-2 flex gap-1.5">
                    {WAITLIST_SLIDES.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSlideIdx(i)}
                        className={cn(
                          "h-1.5 rounded-full transition-all",
                          i === slideIdx ? "w-7 bg-blue-500" : "w-3 bg-white/30",
                        )}
                        aria-label={`Waitlist slide ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/55 p-2">
                  <input
                    type="email"
                    value={waitlistEmail}
                    onChange={(e) => setWaitlistEmail(e.target.value)}
                    placeholder="personal  "
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
                    {waitlistLoading ? "Submitting..." : "Join waitlist"}
                  </button>
                  {waitlistMsg ? <p className="mt-2 text-xs text-blue-200">{waitlistMsg}</p> : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-4 inset-x-0 h-16 w-full z-10 pointer-events-none md:bottom-8 lg:bottom-12">
        <ParticleTextEffect 
          key={JSON.stringify(["PROVE WHAT YOU KNOW", "MENTRIXA"])}
          words={["PROVE WHAT YOU KNOW", "MENTRIXA", "CLIMB", "SOLVE", "WIN"]} 
          className="w-full h-full opacity-60"
          tone="onDark"
        />
      </div>
    </div>
  );
}
