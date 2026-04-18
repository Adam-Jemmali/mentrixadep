"use client";

import { useEffect, useState, useRef, memo, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
      <div ref={mentrixerRef} className="absolute left-0 top-0 will-change-transform">
        <RoleIcon role="mentrixer" className="h-11 w-11 opacity-85 drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]" />
      </div>
      <div ref={guideRef} className="absolute left-0 top-0 will-change-transform">
        <RoleIcon role="guide" className="h-11 w-11 opacity-85 drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]" />
      </div>
    </div>
  );
}

// Letter-by-letter reveal component - memoized for scroll-based animation
const RevealText = memo(function RevealText({ text, progress }: { text: string; progress: number }) {
  const chars = useMemo(() => {
    return text.split('').map((char, idx) => {
      const revealStart = 0.25 + (idx * 0.008);
      const revealEnd = revealStart + 0.15;
      const charProgress = Math.max(0, Math.min(1, (progress - revealStart) / (revealEnd - revealStart)));
      return { char, charProgress };
    });
  }, [text, progress]);
  
  return (
    <>
      {chars.map(({ char, charProgress }, idx) => (
        <span
          key={idx}
          style={{
            opacity: charProgress,
            display: 'inline-block',
            willChange: charProgress > 0 && charProgress < 1 ? 'opacity' : 'auto',
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </>
  );
});
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
  const lineAOpacity = Math.min(1, 0.4 + progress * 1.05);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSlideIdx((n) => (n + 1) % WAITLIST_SLIDES.length);
    }, 3500);
    return () => window.clearInterval(id);
  }, []);

  async function submitWaitlist() {
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
  }

  return (
    <div className="relative flex min-h-screen items-start justify-center overflow-hidden px-4 pb-16 pt-24 sm:px-5 sm:pt-28 md:items-center md:pt-20 md:pb-14 lg:pt-24 lg:pb-10" id="firstseq">
      <div className="hidden md:block">
        <BouncingRoleIcons />
      </div>
      <div
        className="pointer-events-none absolute inset-x-0 top-20 z-20 hidden px-5 text-center sm:block md:top-24 lg:top-28"
        style={{ 
          opacity: revealLeft,
          willChange: revealLeft < 0.99 ? 'opacity' : 'auto',
        }}
      >
        <p className="lp-hero-line lp-hero-line-delay-1 mx-auto w-fit text-[11px] font-semibold uppercase tracking-[0.25em] text-purple-400">
          See your progress. Beat the curve. Book in 3 minutes.
        </p>
      </div>

      <div className="relative z-10 w-full px-0 sm:px-5">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-8 lg:grid lg:grid-cols-[minmax(260px,0.95fr)_minmax(140px,0.35fr)_minmax(320px,0.95fr)] lg:items-center lg:gap-8">
          <div className="relative mx-auto max-w-2xl text-center" style={{ 
            opacity: revealLeft,
            willChange: revealLeft < 0.99 ? 'opacity' : 'auto',
          }}>
            <h1 className="font-extrabold tracking-[-0.05em] text-white">
              <span className="sr-only">Mentrixa — </span>
              <span
                className="lp-hero-line lp-hero-line-delay-2 block mx-auto text-[clamp(26px,9vw,70px)] sm:text-[clamp(34px,7.4vw,70px)]"
                style={{
                  lineHeight: 0.92,
                  transform: `translate3d(0, ${headlineY}px, 0)`,
                  opacity: lineAOpacity,
                  willChange: "transform, opacity",
                  contain: "content",
                }}
              >
                <RevealText text="Prove what " progress={progress} />
              </span>
              <span
                className="lp-hero-line lp-hero-line-delay-3 block mx-auto mt-1 bg-gradient-to-r from-white via-cyan-200 to-cyan-400 bg-clip-text text-[clamp(26px,9vw,70px)] text-transparent sm:text-[clamp(34px,7.4vw,70px)]"
                style={{
                  lineHeight: 0.92,
                  transform: `translate3d(0, ${headlineY * 1.2}px, 0)`,
                  opacity: lineAOpacity,
                  willChange: "transform, opacity",
                  contain: "content",
                }}
              >
                <RevealText text="you know." progress={progress} />
              </span>
            </h1>

            <p className="lp-hero-line lp-hero-line-delay-3 mx-auto mt-5 max-w-[24rem] text-[13px] leading-snug text-slate-300 sm:mt-6 sm:max-w-md sm:text-[14px] md:text-[15px] lg:mx-0">
              Book a verified expert for your exact course. Meet live. Get session-backed study materials within minutes of
              your call.
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row lg:mt-7 lg:justify-start">
              <Link
                href="/auth/signup"
                className="lp-cta-pulse group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#0B1120] shadow-lg shadow-cyan-500/10 transition-all hover:-translate-y-0.5 hover:shadow-cyan-500/20 sm:w-auto sm:px-7 sm:py-3.5"
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
            </div>
          </div>

          <div className="hidden lg:block" aria-hidden />

          <div
            className="w-full pt-2 sm:pt-4 lg:pt-8 xl:pt-12"
            style={{ opacity: revealRight, transform: `translateY(${(1 - revealRight) * 16}px)` }}
          >
            <div id="waitlist" className="relative mx-auto max-w-xl overflow-hidden rounded-2xl border border-white/15 bg-slate-950/78 p-4 text-left shadow-xl shadow-violet-950/45 backdrop-blur-md sm:p-5 lg:ml-auto">
              <p className="mb-2 text-[10px] font-bold tracking-[0.2em] uppercase text-cyan-200">Find my Guide now </p>
              <h3 className="text-white text-lg sm:text-xl font-semibold tracking-tight">Apply for early access </h3>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-black/55 p-3 min-h-[120px]">
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
                  <div className="mt-3 flex gap-1.5">
                    {WAITLIST_SLIDES.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSlideIdx(i)}
                        className={cn(
                          "h-1.5 rounded-full transition-all",
                          i === slideIdx ? "w-7 bg-cyan-300" : "w-3 bg-white/30",
                        )}
                        aria-label={`Waitlist slide ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/55 p-3">
                  <input
                    type="email"
                    value={waitlistEmail}
                    onChange={(e) => setWaitlistEmail(e.target.value)}
                    placeholder="personal /education email "
                    className="w-full rounded-lg border border-white/20 bg-white/95 px-3 py-3 text-sm text-slate-950 outline-none focus:border-cyan-500"
                  />
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setWaitlistRole("student")}
                      className={cn(
                        "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium",
                        waitlistRole === "student" ? "bg-white text-slate-900" : "bg-white/10 text-white",
                      )}
                    >
                      <RoleIcon role="mentrixer" className={cn("h-3 w-3", waitlistRole === "student" ? "" : "brightness-0 invert")} />
                      Mentrixer
                    </button>
                    <button
                      type="button"
                      onClick={() => setWaitlistRole("tutor")}
                      className={cn(
                        "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium",
                        waitlistRole === "tutor" ? "bg-white text-slate-900" : "bg-white/10 text-white",
                      )}
                    >
                      <RoleIcon role="guide" className={cn("h-3 w-3", waitlistRole === "tutor" ? "" : "brightness-0 invert")} />
                      Guide
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => void submitWaitlist()}
                    disabled={waitlistLoading}
                    className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-60"
                  >
                    {waitlistLoading ? "Submitting..." : "Join waitlist"}
                  </button>
                  {waitlistMsg ? <p className="mt-2 text-xs text-cyan-100">{waitlistMsg}</p> : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
