"use client";

/**
 * Marketing landing — visual-first, outcome & ROI copy. Motion via CSS (`globals.css` `.lp-*`).
 */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTrack } from "@/lib/use-track";
import { MentrixaLogoMark } from "@/components/mentrixa-logo";
import { ContactSocialLinks } from "@/components/contact/contact-social-links";
import {
  DEFAULT_PUBLIC_FEEDBACK_EMAIL,
  gmailWebComposeUrl,
  MENTRIXA_LOGO_PNG,
} from "@/lib/mentrixa-brand";

function useInViewOnce<T extends HTMLElement>(rootMargin = "0px 0px -12% 0px") {
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
      { rootMargin, threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);
  return [ref, visible] as const;
}

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
    const N = 56;
    type P = { x: number; y: number; vx: number; vy: number; r: number; o: number };
    const lW = () => c.offsetWidth;
    const lH = () => c.offsetHeight;
    const pts: P[] = Array.from({ length: N }, () => ({
      x: Math.random() * lW(),
      y: Math.random() * lH(),
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      r: Math.random() * 1 + 0.25,
      o: Math.random() * 0.3 + 0.06,
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
          if (d < 90) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(100,116,139,${0.06 * (1 - d / 90)})`;
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
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none opacity-60" />;
}

function LandingHeroChrome() {
  return (
    <div className="lp-hero-chrome" aria-hidden>
      <div className="lp-hero-conic" />
      <div className="lp-hero-torus" />
      <div className="lp-hero-shard lp-hero-shard--a" />
      <div className="lp-hero-shard lp-hero-shard--b" />
      <div className="lp-hero-shard lp-hero-shard--c" />
    </div>
  );
}

function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div
        className="lp-orb absolute w-[min(90vw,560px)] h-[min(90vw,560px)] rounded-full opacity-[0.05]"
        style={{
          background: "radial-gradient(circle, #3B82F6, transparent 70%)",
          top: "8%",
          left: "-12%",
        }}
      />
      <div
        className="lp-orb absolute w-[min(70vw,420px)] h-[min(70vw,420px)] rounded-full opacity-[0.04]"
        style={{
          background: "radial-gradient(circle, #6366F1, transparent 70%)",
          bottom: "0%",
          right: "-6%",
        }}
      />
    </div>
  );
}

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

/** One sentence each: what changes for you on Mentrixa (outcome over activity). */
const FEATURES: {
  img: string;
  title: string;
  roi: string;
  accent: string;
}[] = [
  {
    img: "/images/live.png",
    title: "Live sessions",
    roi:
      "A real expert on your exact course, live on screen, while the problem is still fresh. Not a chatbot. Not a YouTube video.",
    accent: "from-blue-500/25 to-transparent",
  },
  {
    img: "/images/quest.png",
    title: "Practice quests",
    roi:
      "Quest generates practice problems from your actual session. Not generic. Not a textbook chapter.",
    accent: "from-violet-500/25 to-transparent",
  },
  {
    img: "/images/sword.png",
    title: "Skill duels",
    roi:
      "Head-to-head quizzes against other students in your subject. If you can beat them under pressure, you can beat the exam question on paper. ",
    accent: "from-orange-500/25 to-transparent",
  },
  {
    img: "/images/xp.png",
    title: "Divisions & XP",
    roi:
      "Every session, quest, and duel earns XP. You rank in your subject's division. When you can see you're improving, you don't stop.",
    accent: "from-emerald-500/25 to-transparent",
  },
  {
    img: "/images/book.png",
    title: "Instant booking",
    roi:
      "You land a time without the scheduling thread — the real cost was always the messages before the calendar opened.",
    accent: "from-sky-500/25 to-transparent",
  },
  {
    img: "/images/package.png",
    title: "Session packages",
    roi:
      "You walk away with something you can reopen — the call fades; your summaries, cards, and follow-ups don’t.",
    accent: "from-pink-500/25 to-transparent",
  },
];

const STEPS = [
  { img: "/images/book.png", title: "Book", line: "You pick a Guide and a slot that fits your week." },
  { img: "/images/live.png", title: "Meet", line: "You show up live — mic, camera, screen share when it helps." },
  { img: "/images/package.png", title: "Unpack", line: "You get materials in your account — ready when you open them." },
  { img: "/images/xp.png", title: "Climb", line: "You keep going with quests, duels, divisions — your loop." },
];

const OUTCOME_STRIP = [
  "Within 10 minutes of every session,  Quest drops your summary, flashcards, and practice problems.",
  "Your Quest practice drills are built from your session, not recycled problems.",
  "Sessions, quests, duels, and your division rank all live in one place. One login. One place to become the best Mentrixer.",
  "Guides set their own rate. Stripe pays them automatically after every session. No invoicing. No chasing payment.",
];

const WITHOUT_SYSTEM = [
  "You spend the same hours studying and get the same result on the next exam.",
  "You keep paying for Chegg, ChatGPT and apps that answer questions but don't fix why you keep asking the same ones.",
  "The exam you're dreading doesn't get easier the longer you wait to start.",
];

const WHY_NOW = [
  "You can book a verified Guide tonight and be in a live session before midnight.",
  "The Quest study pack lands in your account within 10 minutes of the session ending.",
  "Free to create an account. You only pay when you book a session.",
];

const MENTRIXER_PERKS = [
  "You pick Guides by subject and time — no guessing who’s free",
  "You meet on live video with screen share — focus stays on the work",
  "You climb through quests, duels, divisions & XP — progress you can see",
];

const GUIDE_PERKS = [
  "You own your calendar and your rates — sessions on your terms",
  "You get paid after each session — without building your own checkout",
  "You ship session packages from one studio — less manual wrap-up",
];

const PRICING_POINTS = [
  "You join free — you only pay when you book a session",
  "You see one price — the 15% platform fee is already in what you pay",
  "Guides set $15–$60/hr — you always know the range up front",
];

const FEEDBACK_EMAIL = DEFAULT_PUBLIC_FEEDBACK_EMAIL;

export function HomePageClient() {
  const [featRef, featVis] = useInViewOnce<HTMLElement>("0px 0px -14% 0px");
  const [whyRef, whyVis] = useInViewOnce<HTMLElement>("0px 0px -14% 0px");
  const [outcomeRef, outcomeVis] = useInViewOnce<HTMLElement>("0px 0px -16% 0px");
  const [flowRef, flowVis] = useInViewOnce<HTMLElement>("0px 0px -14% 0px");
  const [pricingRef, pricingVis] = useInViewOnce<HTMLElement>("0px 0px -14% 0px");
  const [ctaRef, ctaVis] = useInViewOnce<HTMLElement>("0px 0px -12% 0px");
  const [contactRef, contactVis] = useInViewOnce<HTMLElement>("0px 0px -12% 0px");
  const [heroReady] = useState(true);
  const track = useTrack();

  useEffect(() => {
    track("page_view_landing");
  }, [track]);

  return (
    <div className="lp-root">
      <nav className="lp-nav fixed top-0 left-0 right-0 z-50">
        <div className="max-w-6xl mx-auto px-5 lg:px-10 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-white font-bold text-[16px] tracking-[-0.04em]">
            <MentrixaLogoMark size="sm" className="opacity-95" />
            <span>Mentrixa</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-[13px] text-indigo-200/75 hover:text-white transition-colors">
              Features
            </a>
            <a href="#why" className="text-[13px] text-indigo-200/75 hover:text-white transition-colors">
              Why join
            </a>
            <a href="#flow" className="text-[13px] text-indigo-200/75 hover:text-white transition-colors">
              Flow
            </a>
            <a href="#pricing" className="text-[13px] text-indigo-200/75 hover:text-white transition-colors">
              Pricing
            </a>
            <a href="#contact" className="text-[13px] text-indigo-200/75 hover:text-white transition-colors">
              Contact
            </a>
            <Link href="/auth/signin" className="text-[13px] text-indigo-200/75 hover:text-white transition-colors">
              Sign in
            </Link>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Link
              href="/auth/signup?role=tutor"
              className="text-[12px] font-medium text-slate-300 border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              Become a Guide
            </Link>
            <Link
              href="/auth/signup"
              className="text-[12px] font-semibold text-[#0B1120] bg-white px-3.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Become a Mentrixer
            </Link>
          </div>
          <Link href="/auth/signup" className="sm:hidden text-[12px] font-semibold text-[#0B1120] bg-white px-3 py-1.5 rounded-lg">
            Join
          </Link>
        </div>
      </nav>

      <section className="relative min-h-[92vh] flex flex-col items-center justify-center overflow-hidden lp-hero-bg pt-16 pb-20">
        <ParticleField />
        <FloatingOrbs />
        <LandingHeroChrome />
        <div className="lp-hero-logo-float pointer-events-none hidden sm:block">
          <Image src={MENTRIXA_LOGO_PNG} alt="" width={160} height={160} className="object-contain opacity-[0.65]" priority />
        </div>

        <div className="relative z-10 text-center px-5 max-w-3xl mx-auto">
          <p
            className={cn(
              "lp-hero-line lp-hero-line-delay-1 text-[11px] font-semibold tracking-[0.25em] uppercase text-slate-500 mb-6",
              heroReady && "opacity-100",
            )}
          >
            Real tutors. Live now. Book in 3 minutes.
          </p>

          <h1 className="font-extrabold tracking-[-0.05em] text-white">
            <span
              className="lp-hero-line lp-hero-line-delay-2 block"
              style={{ fontSize: "clamp(38px, 9vw, 84px)", lineHeight: 0.95 }}
            >
              Stop failing the same exam
            </span>
            <span
              className="lp-hero-line lp-hero-line-delay-3 block mt-1 bg-gradient-to-r from-white via-blue-200 to-blue-400 bg-clip-text text-transparent"
              style={{ fontSize: "clamp(38px, 9vw, 84px)", lineHeight: 0.95 }}
            >
              twice.
            </span>
          </h1>

          <p className="mt-8 text-slate-400 text-[15px] md:text-base max-w-md mx-auto leading-snug lp-hero-line lp-hero-line-delay-3">
            Book a verified expert for your exact course. Meet live. Get session-backed study materials within minutes of
            your call. Watch the grade move.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href="/auth/signup"
              className="lp-cta-pulse group inline-flex items-center gap-2 text-sm font-semibold text-[#0B1120] bg-white px-7 py-3.5 rounded-xl shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 hover:-translate-y-0.5 transition-all"
            >
              Become a Mentrixer
              <span className="group-hover:translate-x-0.5 transition-transform">
                <ArrowRight />
              </span>
            </Link>
            <Link
              href="/auth/signup?role=tutor"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-200 border border-white/15 px-7 py-3.5 rounded-xl hover:bg-white/[0.06] transition-colors"
            >
              Become a Guide
            </Link>
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 opacity-40">
          <div className="w-5 h-8 rounded-full border border-white/25 flex justify-center pt-1.5">
            <div className="w-0.5 h-2 bg-white/50 rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      <section ref={outcomeRef} className="lp-band-outcome py-14">
        <div className="max-w-5xl mx-auto px-5">
          <p className="text-center text-[10px] font-bold tracking-[0.2em] uppercase text-violet-300/70 mb-8">
            Here is exactly what you get.
          </p>
          <div className="grid sm:grid-cols-2 gap-6 md:gap-8">
            {OUTCOME_STRIP.map((line, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-3 text-left transition-all duration-500 ease-landing",
                  outcomeVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
                )}
                style={{ transitionDelay: outcomeVis ? `${i * 60}ms` : undefined }}
              >
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400/90 shadow-[0_0_12px_rgba(167,139,250,0.5)]" aria-hidden />
                <p className="text-[13px] md:text-[14px] text-slate-300/90 leading-snug">{line}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section ref={featRef} id="features" className="lp-band-features relative overflow-hidden">
        <FloatingOrbs />
        <div className="relative z-10 max-w-6xl mx-auto px-5 lg:px-10 py-20 md:py-28">
          <div className="mb-12 md:mb-16 max-w-2xl">
            <h2 className="font-bold text-white text-[clamp(26px,4vw,40px)] tracking-[-0.03em] leading-tight">
            6 things in 1 place. 0 overlap with what you already pay for.
            </h2>
          
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={cn(
                  "lp-feature-3d group relative rounded-2xl border border-sky-400/10 bg-slate-950/25 backdrop-blur-sm p-6 overflow-hidden transition-all duration-500 hover:border-sky-300/20",
                  featVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
                )}
                style={{ transitionDelay: featVis ? `${i * 55}ms` : undefined }}
              >
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${f.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                />
                <div className="relative flex gap-4">
                  <div className="relative h-20 w-20 shrink-0 lp-img-float">
                    <Image src={f.img} alt="" width={80} height={80} className="object-contain drop-shadow-md" />
                  </div>
                  <div className="min-w-0 pt-1">
                    <h3 className="text-[15px] font-semibold text-white leading-tight">{f.title}</h3>
                    <p className="mt-2 text-[13px] text-slate-400 leading-snug">{f.roi}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section ref={whyRef} id="why" className="lp-band-why py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-5 lg:px-10">
          <h2 className="text-center font-bold text-white text-[clamp(22px,3.5vw,34px)] tracking-[-0.03em] mb-3">
            Should you join?
          </h2>
          <p className="text-center text-[13px] text-cyan-200/55 max-w-lg mx-auto mb-12 md:mb-14">
            You already feel both sides — here’s the split, so you’re not guessing.
          </p>
          <div className="grid md:grid-cols-2 gap-5 md:gap-6">
            <div
              className={cn(
                "rounded-2xl border border-violet-500/20 bg-gradient-to-br from-slate-950/60 to-violet-950/30 p-8 transition-all duration-500 shadow-lg shadow-violet-950/20",
                whyVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
              )}
            >
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-violet-300/70 mb-4">If nothing changes</p>
              <ul className="space-y-4">
                {WITHOUT_SYSTEM.map((line) => (
                  <li key={line} className="flex gap-3 text-[13px] text-slate-300/90 leading-snug">
                    <span className="mt-2 h-px w-6 shrink-0 bg-violet-500/40" aria-hidden />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
            <div
              className={cn(
                "rounded-2xl border border-emerald-400/25 bg-gradient-to-br from-emerald-950/50 to-slate-950/40 p-8 transition-all duration-500 shadow-lg shadow-emerald-950/25",
                whyVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
              )}
              style={{ transitionDelay: whyVis ? "80ms" : undefined }}
            >
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-emerald-400/90 mb-4">If you start now</p>
              <ul className="space-y-4">
                {WHY_NOW.map((line) => (
                  <li key={line} className="flex gap-3 text-[13px] text-slate-300 leading-snug">
                    <Check className="mt-0.5 text-emerald-400 shrink-0" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>
         
        </div>
      </section>

      <section ref={flowRef} id="flow" className="lp-band-flow relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-5 lg:px-10 py-20 md:py-24">
          <h2 className="font-bold text-white text-[clamp(24px,3.5vw,36px)] tracking-[-0.03em] mb-12 md:mb-16">
            Your flow
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className={cn(
                  "rounded-2xl border border-indigo-400/15 bg-slate-950/35 backdrop-blur-sm p-6 transition-all duration-500 shadow-md shadow-indigo-950/30",
                  flowVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5",
                )}
                style={{ transitionDelay: flowVis ? `${i * 80}ms` : undefined }}
              >
                <div className="relative h-14 w-14 mb-4">
                  <Image src={s.img} alt="" width={56} height={56} className="object-contain opacity-90" />
                </div>
                <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-indigo-300/50 mb-1">0{i + 1}</p>
                <h3 className="text-base font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-[13px] text-slate-400/90 leading-snug">{s.line}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-band-path">
        <div className="max-w-5xl mx-auto px-5 lg:px-10 py-20 md:py-24">
          <h2 className="text-center font-bold text-white text-[clamp(24px,3.5vw,36px)] tracking-[-0.03em] mb-12">
            Choose your role
          </h2>
          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            <div className="rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-950/50 via-slate-950/40 to-slate-900/50 p-8 md:p-10 relative overflow-hidden shadow-xl shadow-emerald-950/20">
              <div className="absolute -right-8 -top-8 opacity-[0.07] pointer-events-none">
                <Image src="/images/user.png" alt="" width={180} height={180} className="object-contain" />
              </div>
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-emerald-400">Mentrixer</span>
              <h3 className="mt-3 text-xl font-bold text-white">Build skill with structure</h3>
              <ul className="mt-6 space-y-3 text-[14px] text-slate-300">
                {MENTRIXER_PERKS.map((p) => (
                  <li key={p} className="flex gap-2.5">
                    <Check className="mt-0.5 text-emerald-400" />
                    {p}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/signup"
                className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#0B1120] bg-white px-5 py-2.5 rounded-lg hover:-translate-y-0.5 transition-transform"
              >
                Start as Mentrixer <ArrowRight />
              </Link>
            </div>

            <div className="rounded-2xl border border-blue-400/30 bg-gradient-to-br from-blue-950/55 via-indigo-950/40 to-slate-950/50 p-8 md:p-10 relative overflow-hidden shadow-xl shadow-blue-950/25">
              <div className="absolute -right-6 -bottom-6 opacity-[0.08] pointer-events-none">
                <Image src="/images/money.png" alt="" width={160} height={160} className="object-contain" />
              </div>
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-blue-400">Guide</span>
              <h3 className="mt-3 text-xl font-bold text-white">Lead sessions your way</h3>
              <ul className="mt-6 space-y-3 text-[14px] text-slate-300">
                {GUIDE_PERKS.map((p) => (
                  <li key={p} className="flex gap-2.5">
                    <Check className="mt-0.5 text-blue-400" />
                    {p}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/signup?role=tutor"
                className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#0B1120] bg-white px-5 py-2.5 rounded-lg hover:-translate-y-0.5 transition-transform"
              >
                Start as Guide <ArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section
        ref={pricingRef}
        id="pricing"
        className={cn(
          "lp-band-pricing py-20 md:py-24 transition-all duration-500",
          pricingVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        )}
      >
        <div className="max-w-lg mx-auto px-5 text-center">
          <h2 className="font-bold text-slate-900 text-[clamp(24px,3vw,34px)] tracking-[-0.03em]">
            Free to join. You only pay when you book.
          </h2>
          <div className="mt-10 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-indigo-700">$15</p>
              <p className="text-[11px] text-slate-600 mt-1">from / hr</p>
            </div>
            <div className="border-x border-slate-300/90">
              <p className="text-2xl font-bold text-indigo-700">$60</p>
              <p className="text-[11px] text-slate-600 mt-1">cap / hr</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-indigo-700">15%</p>
              <p className="text-[11px] text-slate-600 mt-1">fee included</p>
            </div>
          </div>
          <div className="mt-10 text-left space-y-2.5 max-w-sm mx-auto">
            {PRICING_POINTS.map((p) => (
              <div key={p} className="flex items-center gap-2.5 text-[13px] text-slate-700">
                <Check className="text-emerald-600 shrink-0" />
                {p}
              </div>
            ))}
          </div>
          <p className="mt-8 text-[11px] text-slate-500">
            Checkout runs on Stripe · if you’re a Guide, you get paid after each session you run
          </p>
        </div>
      </section>

      <section
        ref={ctaRef}
        className={cn(
          "lp-band-cta py-24 md:py-32 transition-all duration-700",
          ctaVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
        )}
      >
        <div className="max-w-lg mx-auto px-5 text-center">
          <h2 className="font-bold text-white text-[clamp(28px,5vw,44px)] tracking-[-0.04em] leading-[1.05]">
          Your next exam is coming. Book your first session tonight.
          </h2>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#0B1120] bg-white px-8 py-3.5 rounded-xl hover:-translate-y-0.5 transition-transform"
            >
              Become a Mentrixer <ArrowRight />
            </Link>
            <Link
              href="/auth/signup?role=tutor"
              className="text-sm font-medium text-white/90 border border-white/25 px-8 py-3.5 rounded-xl hover:bg-white/10 transition-colors"
            >
              Become a Guide
            </Link>
          </div>
        </div>
      </section>

      <section
        ref={contactRef}
        id="contact"
        className={cn(
          "lp-band-contact py-16 md:py-24 border-t border-white/[0.06] transition-all duration-700",
          contactVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        )}
      >
        <div className="max-w-3xl mx-auto px-5 text-center">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-indigo-300/80 mb-3">Contact + feedback</p>
          <h2 className="font-bold text-white text-[clamp(22px,3.5vw,32px)] tracking-[-0.03em] leading-tight">
            You are why we ship
          </h2>
          <p className="mt-4 text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            Questions, ideas, or a rant about your last session ? We read every message !
          </p>
          <div className="mt-8 flex justify-center">
            <ContactSocialLinks variant="dark" />
          </div>
          <div className="mt-10">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#0b1120] bg-white px-8 py-3.5 rounded-xl shadow-lg shadow-indigo-500/15 hover:-translate-y-0.5 transition-all"
            >
              Contact Mentrixa
              <ArrowRight />
            </Link>
          </div>
        </div>
      </section>

      <footer className="lp-footer-bg py-10 px-5">
        <div className="max-w-6xl mx-auto flex flex-col gap-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
            <div>
              <Link href="/" className="inline-flex items-center gap-2.5">
                <MentrixaLogoMark size="sm" className="opacity-90" />
                <span className="text-[15px] font-bold text-white tracking-tight">Mentrixa</span>
              </Link>
          
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-6 md:gap-10">
              <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
                <Link href="/privacy" className="text-indigo-200/55 hover:text-white transition-colors">
                  Privacy
                </Link>
                <Link href="/terms" className="text-indigo-200/55 hover:text-white transition-colors">
                  Terms
                </Link>
                <Link
                  href="/contact"
                  className="font-semibold text-white border-b border-indigo-400/50 hover:border-indigo-300 pb-0.5 transition-colors"
                >
                  Contact
                </Link>
              </nav>
      
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-white/[0.06]">
            <p className="text-[11px] text-slate-500 order-2 sm:order-1">
              &copy; {new Date().getFullYear()} Mentrixa Inc.
            </p>
            <span className="order-1 sm:order-2 text-[12px] text-indigo-300/70 sm:text-right">
              <a
                href={gmailWebComposeUrl(FEEDBACK_EMAIL)}
                target="_blank"
                rel="noopener noreferrer"
                title="Compose in Gmail (web)"
                className="underline underline-offset-2 hover:text-indigo-100"
              >
                {FEEDBACK_EMAIL}
              </a>
            
            
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
