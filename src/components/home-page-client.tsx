"use client";

/**
 * Marketing landing only — kept separate from `root-layout-client` so the app shell
 * and `/` route do not share one oversized client module.
 *
 * No GSAP here: Next dev (Turbopack) can async-split `gsap` into a client chunk; Fast Refresh
 * may invalidate that chunk while this module still references it. Animations use CSS + IO + rAF.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { LandingStatItem } from "@/lib/landing-stats";
import { cn } from "@/lib/utils";
import { useTrack } from "@/lib/use-track";

function useInViewOnce<T extends HTMLElement>(rootMargin = "0px 0px -14% 0px") {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        }
      },
      { rootMargin, threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);
  return [ref, visible] as const;
}

/* ───────────────────────────────────────────
   Particle Network Canvas
─────────────────────────────────────────── */
function ParticleField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    c.width = c.offsetWidth * devicePixelRatio;
    c.height = c.offsetHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    const resize = () => {
      c.width = c.offsetWidth * devicePixelRatio;
      c.height = c.offsetHeight * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };
    window.addEventListener("resize", resize);

    const N = 80;
    type P = { x: number; y: number; vx: number; vy: number; r: number; o: number };
    const lW = () => c.offsetWidth;
    const lH = () => c.offsetHeight;
    const pts: P[] = Array.from({ length: N }, () => ({
      x: Math.random() * lW(),
      y: Math.random() * lH(),
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.2 + 0.3,
      o: Math.random() * 0.35 + 0.08,
    }));

    let raf: number;
    const draw = () => {
      const w = lW();
      const h = lH();
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < N; i++) {
        const a = pts[i]!;
        a.x += a.vx;
        a.y += a.vy;
        if (a.x < 0 || a.x > w) a.vx *= -1;
        if (a.y < 0 || a.y > h) a.vy *= -1;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(148,163,184,${a.o})`;
        ctx.fill();
        for (let j = i + 1; j < N; j++) {
          const b = pts[j]!;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 100) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(100,116,139,${0.08 * (1 - d / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.7 }}
    />
  );
}

/* ───────────────────────────────────────────
   Floating Orbs Background
─────────────────────────────────────────── */
function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="lp-orb absolute w-[600px] h-[600px] rounded-full opacity-[0.04]"
        style={{ background: "radial-gradient(circle, #3B82F6, transparent 70%)", top: "10%", left: "-10%" }} />
      <div className="lp-orb absolute w-[500px] h-[500px] rounded-full opacity-[0.03]"
        style={{ background: "radial-gradient(circle, #6366F1, transparent 70%)", top: "40%", right: "-8%" }} />
      <div className="lp-orb absolute w-[400px] h-[400px] rounded-full opacity-[0.04]"
        style={{ background: "radial-gradient(circle, #06B6D4, transparent 70%)", bottom: "5%", left: "30%" }} />
    </div>
  );
}

/* ───────────────────────────────────────────
   Testimonial Carousel
─────────────────────────────────────────── */
const TESTIMONIALS = [
  {
    quote: "The AI package after each session captures exactly what we covered. It's like having a personal course log that actually works.",
    name: "Sofia M.", role: "CS Major · Student",
    result: "GPA 2.7 → 3.8", avatar: "SM", ring: "ring-emerald-500/30",
  },
  {
    quote: "Found a calculus tutor in five minutes. Video call was smooth and the follow-up Quests kept me on track for midterms.",
    name: "Priya K.", role: "2nd Year Engineering",
    result: "Passed final after failing midterm", avatar: "PK", ring: "ring-blue-500/30",
  },
  {
    quote: "I set my schedule, get paid instantly, and the AI handles notes. I just focus on teaching. This platform respects tutors.",
    name: "Daniel R.", role: "Grad Algorithms Tutor",
    result: "Earns $2,100/mo", avatar: "DR", ring: "ring-violet-500/30",
  },
];

function TestimonialCarousel({ reveal = false }: { reveal?: boolean }) {
  const [active, setActive] = useState(0);
  const next = useCallback(() => setActive((a) => (a + 1) % TESTIMONIALS.length), []);

  useEffect(() => {
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [next]);

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {TESTIMONIALS.map((t, i) => (
        <button
          key={i}
          type="button"
          onClick={() => setActive(i)}
          className={cn(
            "proof-card text-left rounded-2xl p-6 border cursor-pointer transition-all duration-500 ease-landing",
            !reveal && "opacity-0 translate-y-5",
            reveal &&
              (i === active
                ? "bg-white/[0.08] border-white/[0.15] shadow-lg shadow-blue-500/5 scale-[1.02] opacity-100 translate-y-0"
                : "bg-white/[0.03] border-white/[0.06] opacity-60 hover:opacity-80 translate-y-0"),
          )}
          style={{ transitionDelay: reveal ? `${i * 80}ms` : undefined }}
        >
          <p className="text-sm text-slate-300 leading-relaxed mb-5">
            &ldquo;{t.quote}&rdquo;
          </p>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full ring-2 ${t.ring} bg-white/10 flex items-center justify-center text-[11px] font-bold text-white shrink-0`}>
                {t.avatar}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{t.name}</p>
                <p className="text-[11px] text-slate-500">{t.role}</p>
              </div>
            </div>
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full whitespace-nowrap">
              {t.result}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ───────────────────────────────────────────
   Inline SVG Icons
─────────────────────────────────────────── */
const ArrowRight = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);
const Check = ({ className = "" }: { className?: string }) => (
  <svg className={`w-4 h-4 shrink-0 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

/* ───────────────────────────────────────────
   Data
─────────────────────────────────────────── */
const FEATURES = [
  { emoji: "🎥", title: "Live 1-on-1 Video", desc: "Private calls. Screen share, camera, mic. Zero installs.", hook: "Without → studying alone, no feedback", accent: "from-blue-500/20 to-blue-600/5", border: "hover:border-blue-500/20" },
  { emoji: "🧠", title: "AI Quest Practice", desc: "Problems calibrated to your weak spots. Coach or Exam mode.", hook: "Without → repeating the same mistakes forever", accent: "from-violet-500/20 to-violet-600/5", border: "hover:border-violet-500/20" },
  { emoji: "⚔️", title: "Skill Duels", desc: "Head-to-head battles against peers. Pressure-test knowledge.", hook: "Without → never knowing where you really stand", accent: "from-orange-500/20 to-orange-600/5", border: "hover:border-orange-500/20" },
  { emoji: "🏆", title: "Divisions & XP", desc: "Ranked divisions. Earn XP. Climb leaderboards.", hook: "Without → no accountability, no momentum", accent: "from-emerald-500/20 to-emerald-600/5", border: "hover:border-emerald-500/20" },
  { emoji: "⚡", title: "Instant Booking", desc: "Browse, click, booked. One-click Stripe checkout.", hook: "Without → weeks of scheduling back-and-forth", accent: "from-sky-500/20 to-sky-600/5", border: "hover:border-sky-500/20" },
  { emoji: "📦", title: "AI Session Archive", desc: "AI drops summary, flashcards, key points, and Quests after every session.", hook: "Without → forgetting 80% within 24 hours", accent: "from-pink-500/20 to-pink-600/5", border: "hover:border-pink-500/20" },
];

const STEPS = [
  { num: "01", icon: "🔍", title: "Browse & Book", desc: "Pick your guide by subject, availability, and rate." },
  { num: "02", icon: "📹", title: "Live Session", desc: "Private 1-on-1 video. Screen share. Real-time feedback." },
  { num: "03", icon: "🧠", title: "AI Package Drops", desc: "AI creates summary, flashcards, and custom Quests." },
  { num: "04", icon: "📈", title: "Level Up", desc: "Solve Quests, earn XP, climb your Division." },
];

const STUDENT_PERKS = [
  "Browse expert guides by subject, time, and price",
  "Live 1-on-1 video calls with screen sharing",
  "AI summaries, flashcards, and follow-up Quests",
  "Earn XP and climb Division leaderboards",
  "Dual mode Quests — Coach or Exam",
];

const TUTOR_PERKS = [
  "Set your schedule, subjects, and hourly rate",
  "Stripe payouts after every session",
  "Auto-approve or manually review bookings",
  "AI Studio generates packages for you",
  "Full earnings dashboard and analytics",
];

const PRICING_POINTS = [
  "Free account — browse guides and book when ready",
  "No monthly subscription. No commitment.",
  "15% platform fee included in displayed price",
  "Guides set rates between $15–$60/hr",
  "Stripe-secured. Refund policy in Terms.",
];

const SUBJECTS = [
  "Calculus", "Data Structures", "Algorithms", "Statistics", "Circuits",
  "Linear Algebra", "Chemistry", "Physics", "Discrete Math", "Networks",
  "Thermodynamics", "Machine Learning", "Operating Systems", "Organic Chem",
];

/* ═══════════════════════════════════════════
   LANDING PAGE
═══════════════════════════════════════════ */
export function HomePageClient({
  stats,
  ticker,
}: {
  stats: LandingStatItem[];
  ticker: { v: string; l: string }[];
}) {
  const [statsRef, statsVis] = useInViewOnce<HTMLElement>("0px 0px -16% 0px");
  const [featRef, featVis] = useInViewOnce<HTMLElement>("0px 0px -18% 0px");
  const [flowRef, flowVis] = useInViewOnce<HTMLElement>("0px 0px -18% 0px");
  const [proofRef, proofVis] = useInViewOnce<HTMLElement>("0px 0px -16% 0px");
  const [pricingRef, pricingVis] = useInViewOnce<HTMLElement>("0px 0px -16% 0px");
  const [ctaRef, ctaVis] = useInViewOnce<HTMLElement>("0px 0px -12% 0px");
  /** Start visible: delayed reveal relied on rAF; any client error before that left a blank hero. */
  const [heroReady] = useState(true);
  const track = useTrack();

  useEffect(() => {
    track("page_view_landing");
  }, [track]);

  useEffect(() => {
    if (!statsVis || !statsRef.current) return;
    const nums = [...statsRef.current.querySelectorAll<HTMLElement>(".count-val")];
    const ends = nums.map((el) => Number(el.dataset.val ?? "0"));
    const start = performance.now();
    const duration = 1400;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) * (1 - t);
      nums.forEach((el, i) => {
        el.textContent = Math.round(ends[i]! * eased).toLocaleString();
      });
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [statsVis, statsRef]);

  const doubled = [...SUBJECTS, ...SUBJECTS];

  return (
    <div className="lp-root">

      {/* ═══════════ NAV ═══════════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0B1120]/80 backdrop-blur-xl border-b border-white/[0.04]">
        <div
          className={cn(
            "max-w-7xl mx-auto px-6 lg:px-12 h-14 flex items-center justify-between transition-all duration-500 ease-landing",
            heroReady ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2",
          )}
          style={{ transitionDelay: heroReady ? "100ms" : undefined }}
        >
          <Link href="/" className="lp-nav-item text-white font-bold text-[17px] tracking-[-0.04em]">
            Mentrixa
          </Link>
          <div className="hidden md:flex items-center gap-7">
            <a href="#features" className="lp-nav-item text-[13px] text-slate-400 hover:text-white transition-colors duration-150">Features</a>
            <a href="#how-it-works" className="lp-nav-item text-[13px] text-slate-400 hover:text-white transition-colors duration-150">How it works</a>
            <a href="#pricing" className="lp-nav-item text-[13px] text-slate-400 hover:text-white transition-colors duration-150">Pricing</a>
            <Link href="/auth/signin" className="lp-nav-item text-[13px] text-slate-400 hover:text-white transition-colors duration-150">Sign in</Link>
          </div>
          <div className="hidden md:flex items-center gap-2.5">
            <Link href="/auth/signup?role=tutor" className="lp-nav-item text-[13px] font-medium text-slate-300 border border-white/10 px-4 py-1.5 rounded-md hover:bg-white/5 transition-all duration-150">
              Teach on Mentrixa
            </Link>
            <Link href="/auth/signup" className="lp-nav-item text-[13px] font-semibold text-[#0B1120] bg-white px-4 py-1.5 rounded-md hover:bg-slate-100 hover:-translate-y-px active:scale-[0.98] transition-all duration-150">
              Get started
            </Link>
          </div>
          <Link href="/auth/signup" className="md:hidden lp-nav-item text-[13px] font-semibold text-[#0B1120] bg-white px-3.5 py-1.5 rounded-md">
            Join
          </Link>
        </div>
      </nav>

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden lp-hero-bg">
        <ParticleField />
        <FloatingOrbs />

        <div className="relative z-10 text-center px-6 max-w-4xl pt-20 pb-24">
          <div
            className={cn(
              "hero-tag inline-flex items-center gap-2.5 bg-white/[0.05] border border-white/[0.08] rounded-full px-4 py-1.5 mb-10 transition-all duration-500 ease-landing",
              heroReady ? "opacity-100 scale-100" : "opacity-0 scale-90",
            )}
            style={{ transitionDelay: heroReady ? "350ms" : undefined }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-[11px] font-medium text-slate-400 tracking-widest uppercase">Live now · Ottawa, Canada</span>
          </div>

          <h1 className="leading-[0.9]" style={{ letterSpacing: "-0.05em" }}>
            <span
              className={cn(
                "hero-h1 block font-extrabold text-white transition-all duration-1000 ease-landing",
                heroReady ? "opacity-100 translate-y-0 blur-none" : "opacity-0 translate-y-[60px] blur-sm",
              )}
              style={{ fontSize: "clamp(46px, 8.5vw, 100px)", transitionDelay: heroReady ? "500ms" : undefined }}
            >
              Where the serious
            </span>
            <span
              className={cn(
                "hero-h1 block font-extrabold transition-all duration-1000 ease-landing",
                heroReady ? "opacity-100 translate-y-0 blur-none" : "opacity-0 translate-y-[60px] blur-sm",
              )}
              style={{
                fontSize: "clamp(46px, 8.5vw, 100px)",
                background: "linear-gradient(135deg, #fff 30%, #60A5FA 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                transitionDelay: heroReady ? "620ms" : undefined,
              }}
            >
              come to learn.
            </span>
          </h1>

          <p
            className={cn(
              "hero-sub mt-8 text-slate-400 max-w-xl mx-auto leading-relaxed transition-all duration-700 ease-landing",
              heroReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
            )}
            style={{ fontSize: "clamp(14px, 1.6vw, 17px)", transitionDelay: heroReady ? "1000ms" : undefined }}
          >
            Live 1-on-1 tutoring · AI-powered Quests · Peer duels · Ranked divisions.
            <span className="block mt-1 text-slate-300 font-medium">One platform. Real results.</span>
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href="/auth/signup"
              className={cn(
                "hero-cta group inline-flex items-center gap-2.5 text-sm font-semibold text-[#0B1120] bg-white px-8 py-3.5 rounded-lg shadow-[0_0_40px_rgba(255,255,255,0.08)] hover:shadow-[0_0_60px_rgba(255,255,255,0.12)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-500 ease-landing",
                heroReady ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95",
              )}
              style={{ transitionDelay: heroReady ? "1300ms" : undefined }}
            >
              Start Learning Free
              <span className="group-hover:translate-x-0.5 transition-transform duration-200"><ArrowRight /></span>
            </Link>
            <Link
              href="/auth/signup?role=tutor"
              className={cn(
                "hero-cta inline-flex items-center gap-2 text-sm font-medium text-slate-300 border border-white/[0.12] px-8 py-3.5 rounded-lg hover:bg-white/[0.04] hover:border-white/20 hover:-translate-y-0.5 transition-all duration-500 ease-landing",
                heroReady ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95",
              )}
              style={{ transitionDelay: heroReady ? "1380ms" : undefined }}
            >
              Teach on Mentrixa
            </Link>
          </div>

          {/* Stats ticker */}
          <div
            className={cn(
              "hero-ticker mt-14 flex flex-wrap justify-center gap-x-6 gap-y-2 transition-opacity duration-700 ease-out",
              heroReady ? "opacity-100" : "opacity-0",
            )}
            style={{ transitionDelay: heroReady ? "1700ms" : undefined }}
          >
            {ticker.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-2 text-[13px]">
                <span className="font-bold text-white tabular-nums">{s.v}</span>
                <span className="text-slate-500">{s.l}</span>
              </span>
            ))}
          </div>
        </div>

        <div
          className={cn(
            "hero-scroll absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 transition-opacity duration-500",
            heroReady ? "opacity-30" : "opacity-0",
          )}
          style={{ transitionDelay: heroReady ? "2000ms" : undefined }}
        >
          <div className="w-5 h-8 rounded-full border border-white/20 flex justify-center pt-1.5">
            <div className="w-0.5 h-2 bg-white/40 rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      {/* ═══════════ SUBJECT TAPE ═══════════ */}
      <div className="overflow-hidden lp-tape-bg py-3.5 select-none">
        <div className="flex animate-tape whitespace-nowrap">
          {doubled.map((s, i) => (
            <span key={i} className="mx-6 text-[12px] font-medium text-slate-500/60 tracking-wider uppercase shrink-0">
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* ═══════════ STATS ═══════════ */}
      <section ref={statsRef} className="lp-section-dark">
        <div className="max-w-5xl mx-auto px-6 lg:px-12 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className={cn(
                  "stat-cell text-center transition-all duration-500 ease-landing",
                  statsVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
                )}
                style={{ transitionDelay: statsVis ? `${i * 60}ms` : undefined }}
              >
                <div className="flex items-baseline justify-center gap-0.5">
                  <span className="count-val text-[36px] font-bold text-white xp-number tracking-tight" data-val={s.value}>0</span>
                  {s.suffix && <span className="text-[28px] font-bold text-slate-400">{s.suffix}</span>}
                </div>
                <p className="mt-1 text-[13px] text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FEATURES ═══════════ */}
      <section ref={featRef} id="features" className="lp-section-mid relative overflow-hidden">
        <FloatingOrbs />
        <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-12 py-24">
          <div className="mb-16 max-w-lg">
            <span className="inline-block text-[10px] font-bold tracking-[0.2em] uppercase text-blue-400 mb-3">
              The full toolkit
            </span>
            <h2 className="font-bold text-white" style={{ fontSize: "clamp(26px, 3.5vw, 40px)", letterSpacing: "-0.03em" }}>
              Everything working together.
            </h2>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed">
              Most platforms give you a tutor. Mentrixa gives you a system.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={cn(
                  `feat-card group relative bg-white/[0.03] border border-white/[0.06] ${f.border} rounded-xl p-6 hover:bg-white/[0.06] transition-all duration-500 ease-landing cursor-default`,
                  featVis ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-[0.96]",
                )}
                style={{ transitionDelay: featVis ? `${i * 60}ms` : undefined }}
              >
                <div className={`absolute inset-0 rounded-xl bg-gradient-to-b ${f.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <div className="relative z-10">
                  <span className="text-2xl block mb-3">{f.emoji}</span>
                  <h3 className="text-sm font-semibold text-white mb-1.5">{f.title}</h3>
                  <p className="text-[13px] text-slate-400 leading-relaxed mb-4">{f.desc}</p>
                  <p className="text-[11px] text-slate-600 border-t border-white/[0.06] pt-3">
                    <span className="text-red-400/80">↳</span> {f.hook}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ TESTIMONIALS ═══════════ */}
      <section ref={proofRef} className="lp-section-dark relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 lg:px-12 py-24">
          <div className="text-center mb-14">
            <span className="inline-block text-[10px] font-bold tracking-[0.2em] uppercase text-emerald-400 mb-3">
              Real Mentrixers
            </span>
            <h2 className="font-bold text-white" style={{ fontSize: "clamp(26px, 3.5vw, 40px)", letterSpacing: "-0.03em" }}>
              Results that speak.
            </h2>
          </div>
          <TestimonialCarousel reveal={proofVis} />
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section ref={flowRef} id="how-it-works" className="lp-section-mid relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 lg:px-12 py-24">
          <div className="mb-14">
            <span className="inline-block text-[10px] font-bold tracking-[0.2em] uppercase text-blue-400 mb-3">
              The process
            </span>
            <h2 className="font-bold text-white" style={{ fontSize: "clamp(26px, 3.5vw, 40px)", letterSpacing: "-0.03em" }}>
              First session to level-up in 4 steps.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.04] rounded-2xl overflow-hidden">
            {STEPS.map((s, i) => (
              <div
                key={s.num}
                className={cn(
                  "flow-step group bg-[#0E1729] p-7 hover:bg-[#111D35] transition-all duration-500 ease-landing relative",
                  flowVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
                )}
                style={{ transitionDelay: flowVis ? `${i * 100}ms` : undefined }}
              >
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 right-0 -translate-y-1/2 w-px h-12 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
                )}
                <span className="text-3xl block mb-4">{s.icon}</span>
                <span className="block text-[10px] font-bold tracking-[0.2em] uppercase text-slate-600 mb-2">{s.num}</span>
                <h3 className="text-sm font-semibold text-white mb-1.5 group-hover:text-blue-400 transition-colors duration-200">{s.title}</h3>
                <p className="text-[13px] text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ TWO SIDES ═══════════ */}
      <section className="lp-section-dark">
        <div className="max-w-6xl mx-auto px-6 lg:px-12 py-24">
          <div className="text-center mb-14">
            <span className="inline-block text-[10px] font-bold tracking-[0.2em] uppercase text-slate-500 mb-3">
              Two paths
            </span>
            <h2 className="font-bold text-white" style={{ fontSize: "clamp(26px, 3.5vw, 40px)", letterSpacing: "-0.03em" }}>
              Every Mentrixer has a role.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-px bg-white/[0.06] rounded-2xl overflow-hidden">
            {/* Student */}
            <div className="bg-[#0E1729] p-10 lg:p-12 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
              <span className="inline-block text-[10px] font-bold tracking-[0.2em] uppercase text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full mb-6">Learner</span>
              <h3 className="text-2xl font-bold text-white mb-1.5">Stop cramming.</h3>
              <p className="text-sm text-slate-500 mb-8">Start training with a system that compounds.</p>
              <ul className="space-y-2.5 text-[13px] text-slate-300 mb-10">
                {STUDENT_PERKS.map((p) => (
                  <li key={p} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 text-emerald-400" />
                    {p}
                  </li>
                ))}
              </ul>
              <Link href="/auth/signup" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0B1120] bg-white px-6 py-2.5 rounded-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200">
                Join as Learner <ArrowRight />
              </Link>
            </div>

            {/* Tutor */}
            <div className="bg-[#0C1422] p-10 lg:p-12 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
              <span className="inline-block text-[10px] font-bold tracking-[0.2em] uppercase text-blue-400 bg-blue-400/10 px-2.5 py-1 rounded-full mb-6">Guide</span>
              <h3 className="text-2xl font-bold text-white mb-1.5">Teach your way.</h3>
              <p className="text-sm text-slate-500 mb-8">Get paid every session. AI does admin.</p>
              <ul className="space-y-2.5 text-[13px] text-slate-300 mb-10">
                {TUTOR_PERKS.map((p) => (
                  <li key={p} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 text-blue-400" />
                    {p}
                  </li>
                ))}
              </ul>
              <Link href="/auth/signup?role=tutor" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0B1120] bg-white px-6 py-2.5 rounded-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200">
                Join as Guide <ArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ PRICING ═══════════ */}
      <section
        ref={pricingRef}
        id="pricing"
        className={cn(
          "lp-section-mid transition-all duration-500 ease-landing",
          pricingVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5",
        )}
      >
        <div className="max-w-3xl mx-auto px-6 lg:px-12 py-24 text-center">
          <span className="inline-block text-[10px] font-bold tracking-[0.2em] uppercase text-blue-400 mb-3">
            Transparent pricing
          </span>
          <h2 className="font-bold text-white mb-2" style={{ fontSize: "clamp(26px, 3.5vw, 40px)", letterSpacing: "-0.03em" }}>
            Pay only when you book.
          </h2>
          <p className="text-sm text-slate-500 mb-12">No subscriptions. No hidden fees.</p>

          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8 mb-8">
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <p className="text-2xl font-bold text-white tabular-nums">$15</p>
                <p className="text-[11px] text-slate-500 mt-1">starting / hr</p>
              </div>
              <div className="text-center border-x border-white/[0.06]">
                <p className="text-2xl font-bold text-white tabular-nums">$60</p>
                <p className="text-[11px] text-slate-500 mt-1">max / hr</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white tabular-nums">15%</p>
                <p className="text-[11px] text-slate-500 mt-1">fee (included)</p>
              </div>
            </div>
            <div className="text-left space-y-2">
              {PRICING_POINTS.map((p) => (
                <div key={p} className="flex items-center gap-2.5 text-[13px] text-slate-400">
                  <Check className="text-emerald-400" />
                  {p}
                </div>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-slate-600">
            Stripe-secured payments. Tutors receive payouts after each session.
          </p>
        </div>
      </section>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section
        ref={ctaRef}
        className={cn(
          "relative lp-section-dark overflow-hidden transition-all duration-700 ease-landing",
          ctaVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5",
        )}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(37,99,235,0.06) 0%, transparent 70%)" }} />
        <div className="relative z-10 max-w-3xl mx-auto px-6 lg:px-12 py-28 text-center">
          <h2 className="font-bold text-white mb-4" style={{ fontSize: "clamp(28px, 4.5vw, 50px)", letterSpacing: "-0.04em" }}>
            Your next session<br />is one click away.
          </h2>
          <p className="text-slate-400 text-sm mb-3">
            Every week you don&apos;t start, someone else does.
          </p>
          <p className="text-slate-600 text-[13px] mb-10">
            Free to join. Pay only when you book. Cancel anytime.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/auth/signup" className="group inline-flex items-center gap-2.5 text-sm font-semibold text-[#0B1120] bg-white px-9 py-4 rounded-lg shadow-[0_0_50px_rgba(255,255,255,0.06)] hover:shadow-[0_0_80px_rgba(255,255,255,0.1)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200">
              Become a Mentrixer
              <span className="group-hover:translate-x-0.5 transition-transform duration-200"><ArrowRight /></span>
            </Link>
            <Link href="/auth/signup?role=tutor" className="text-sm font-medium text-slate-400 border border-white/10 px-9 py-4 rounded-lg hover:bg-white/[0.04] hover:text-slate-200 transition-all duration-200">
              I want to teach →
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="lp-footer-bg border-t border-white/[0.04] py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <span className="text-[15px] font-bold text-white tracking-tight">Mentrixa</span>
            <p className="text-[11px] text-slate-600 mt-1">Made for serious learners. Built in Ottawa.</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-slate-600">
            <Link href="/privacy" className="hover:text-slate-300 transition-colors duration-150">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-300 transition-colors duration-150">Terms</Link>
            <Link href="/contact" className="hover:text-slate-300 transition-colors duration-150">Contact</Link>
          </div>
          <p className="text-[11px] text-slate-700">&copy; {new Date().getFullYear()} Mentrixa Inc.</p>
        </div>
      </footer>
    </div>
  );
}
