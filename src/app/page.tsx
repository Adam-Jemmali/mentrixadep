"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { countUp } from "@/lib/gsap";

gsap.registerPlugin(ScrollTrigger);

const HERO_PHRASES = [
  "Your grades are not your ceiling.",
  "Every session makes the next one easier.",
  "The best Mentrixers are already here.",
  "Knowledge compounds. Start now.",
] as const;

export default function Home() {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const phraseRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<SVGSVGElement>(null);
  const glowRef = useRef<SVGCircleElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const featRef = useRef<HTMLDivElement>(null);
  const identRef = useRef<HTMLDivElement>(null);
  const flowRef = useRef<HTMLDivElement>(null);
  const proofRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // ── Hero entrance ──
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

      tl.fromTo(".nav-item", { opacity: 0, y: -10 }, { opacity: 1, y: 0, stagger: 0.05, duration: 0.4 }, 0.2);

      tl.fromTo(
        logoRef.current,
        { scale: 0.7, opacity: 0, rotation: -8 },
        { scale: 1, opacity: 0.06, rotation: 0, duration: 1.4, ease: "power3.out" },
        0.3,
      );

      if (glowRef.current) {
        tl.fromTo(glowRef.current, { opacity: 0 }, { opacity: 0.5, duration: 1 }, 0.5);
        gsap.to(glowRef.current, {
          opacity: 0.25,
          duration: 2.5,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          delay: 1.5,
        });
      }

      gsap.to(logoRef.current, {
        y: -8,
        duration: 4,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: 1.5,
      });

      tl.fromTo(
        ".hero-headline",
        { y: 60, opacity: 0, filter: "blur(6px)" },
        { y: 0, opacity: 1, filter: "blur(0px)", stagger: 0.12, duration: 0.8 },
        0.5,
      );

      tl.fromTo(".hero-phrase", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, 1.3);
      tl.fromTo(".hero-cta", { opacity: 0, y: 14 }, { opacity: 1, y: 0, stagger: 0.08, duration: 0.4 }, 1.6);
      tl.fromTo(".hero-meta", { opacity: 0 }, { opacity: 1, stagger: 0.06, duration: 0.35 }, 1.9);

      // ── Stats count-up ──
      if (statsRef.current) {
        const nums = statsRef.current.querySelectorAll<HTMLElement>(".count-val");
        ScrollTrigger.create({
          trigger: statsRef.current,
          start: "top 80%",
          once: true,
          onEnter: () => {
            nums.forEach((el) => {
              const end = Number(el.dataset.val || "0");
              countUp(el, end, 1.4);
            });
          },
        });
      }

      // ── Features ──
      if (featRef.current) {
        const rows = featRef.current.querySelectorAll(".feat-row");
        ScrollTrigger.create({
          trigger: featRef.current,
          start: "top 78%",
          once: true,
          onEnter: () => {
            gsap.fromTo(rows, { opacity: 0, x: -20 }, { opacity: 1, x: 0, stagger: 0.08, duration: 0.5, ease: "power3.out" });
          },
        });
      }

      // ── Identity ──
      if (identRef.current) {
        const blocks = identRef.current.querySelectorAll(".ident-block");
        ScrollTrigger.create({
          trigger: identRef.current,
          start: "top 78%",
          once: true,
          onEnter: () => {
            gsap.fromTo(blocks, { opacity: 0, y: 30 }, { opacity: 1, y: 0, stagger: 0.15, duration: 0.6, ease: "power3.out" });
          },
        });
      }

      // ── Flow ──
      if (flowRef.current) {
        const steps = flowRef.current.querySelectorAll(".flow-step");
        ScrollTrigger.create({
          trigger: flowRef.current,
          start: "top 78%",
          once: true,
          onEnter: () => {
            gsap.fromTo(steps, { opacity: 0, y: 20 }, { opacity: 1, y: 0, stagger: 0.1, duration: 0.5, ease: "power3.out" });
          },
        });
      }

      // ── Proof ──
      if (proofRef.current) {
        const cards = proofRef.current.querySelectorAll(".proof-card");
        ScrollTrigger.create({
          trigger: proofRef.current,
          start: "top 80%",
          once: true,
          onEnter: () => {
            gsap.fromTo(cards, { opacity: 0, y: 20 }, { opacity: 1, y: 0, stagger: 0.1, duration: 0.5, ease: "power3.out" });
          },
        });
      }

      // ── CTA ──
      if (ctaRef.current) {
        ScrollTrigger.create({
          trigger: ctaRef.current,
          start: "top 85%",
          once: true,
          onEnter: () => {
            gsap.fromTo(ctaRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" });
          },
        });
      }
    });

    // ── Phrase rotation ──
    const interval = setInterval(() => {
      if (!phraseRef.current) return;
      const el = phraseRef.current;
      gsap.to(el, {
        y: -30,
        opacity: 0,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => {
          setPhraseIdx((p) => (p + 1) % HERO_PHRASES.length);
          gsap.fromTo(el, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "power3.out" });
        },
      });
    }, 3400);

    return () => {
      ctx.revert();
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen">
      {/* ═══════════ NAVBAR ═══════════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 lg:px-16 h-14 flex items-center justify-between">
          <Link href="/" className="nav-item text-white font-bold text-lg tracking-[-0.04em]">
            Mentrixa
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="nav-item text-sm text-slate-400 hover:text-white transition-colors">Features</a>
            <a href="#mentrixers" className="nav-item text-sm text-slate-400 hover:text-white transition-colors">Mentrixers</a>
            <a href="#how-it-works" className="nav-item text-sm text-slate-400 hover:text-white transition-colors">How it works</a>
            <Link href="/auth/signin" className="nav-item text-sm text-slate-400 hover:text-white transition-colors">Sign in</Link>
            <Link
              href="/auth/signup"
              className="nav-item text-sm font-semibold text-slate-900 bg-white px-5 py-2 rounded-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200"
            >
              Join Mentrixa
            </Link>
          </div>
          <Link href="/auth/signup" className="md:hidden nav-item text-sm font-semibold text-slate-900 bg-white px-4 py-1.5 rounded-lg">
            Join
          </Link>
        </div>
      </nav>

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative min-h-screen flex items-center justify-center bg-slate-900 overflow-hidden pt-14">
        {/* Floating M logo */}
        <svg
          ref={logoRef}
          viewBox="0 0 200 200"
          className="absolute w-[500px] h-[500px] md:w-[700px] md:h-[700px] pointer-events-none select-none"
          fill="none"
          style={{ opacity: 0 }}
        >
          <defs>
            <radialGradient id="hero-glow-gradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#1E3A8A" stopOpacity={0} />
            </radialGradient>
          </defs>
          <circle ref={glowRef} cx="100" cy="100" r="90" fill="url(#hero-glow-gradient)" />
          <text
            x="50%"
            y="54%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="font-bold"
            fill="white"
            fontSize="140"
            opacity={0.7}
          >
            M
          </text>
        </svg>

        <div className="relative z-10 text-center px-6 max-w-3xl">
          <div className="hero-headline mb-2">
            <span className="inline-block text-[11px] font-semibold tracking-[0.2em] uppercase text-mentrixa-400">
              The Mentrixe platform
            </span>
          </div>

          <h1 className="hero-headline font-extrabold text-white leading-[0.92]" style={{ fontSize: "clamp(40px, 7vw, 88px)", letterSpacing: "-0.045em" }}>
            Where the serious<br />come to learn.
          </h1>

          <div ref={phraseRef} className="hero-phrase mt-8 text-lg text-slate-400 h-8">
            {HERO_PHRASES[phraseIdx]}
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/auth/signup"
              className="hero-cta text-sm font-semibold text-slate-900 bg-white px-8 py-3.5 rounded-lg shadow-lg shadow-white/10 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200"
            >
              Become a Mentrixe
            </Link>
            <Link
              href="/auth/signup?role=tutor"
              className="hero-cta text-sm font-semibold text-slate-300 border border-white/15 px-8 py-3.5 rounded-lg hover:bg-white/5 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              Teach on Mentrixa
            </Link>
          </div>

          <div className="mt-14 flex flex-wrap justify-center gap-8 text-[13px] text-slate-500">
            <span className="hero-meta flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Mentrixers online
            </span>
            <span className="hero-meta">500+ Mentrixers</span>
            <span className="hero-meta">4.9 avg rating</span>
            <span className="hero-meta">Stripe-secured</span>
          </div>
        </div>
      </section>

      {/* ═══════════ STATS BAR ═══════════ */}
      <section ref={statsRef} className="border-b border-slate-200/80 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-16 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s) => (
            <div key={s.label}>
              <span className="count-val text-3xl font-bold tracking-tight text-slate-900 xp-number" data-val={s.value}>0</span>
              {s.suffix && <span className="text-3xl font-bold text-slate-900">{s.suffix}</span>}
              <p className="mt-1 text-sm text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ FEATURES ═══════════ */}
      <section ref={featRef} id="features" className="py-28 px-6 lg:px-16 max-w-7xl mx-auto">
        <span className="block text-[11px] font-semibold tracking-[0.15em] uppercase text-mentrixa-600 mb-3">
          The arsenal
        </span>
        <h2 className="font-bold text-slate-900 mb-16" style={{ fontSize: "clamp(28px, 3.5vw, 48px)", letterSpacing: "-0.03em" }}>
          Everything you get.
        </h2>

        <div className="space-y-0">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="feat-row group flex items-start gap-8 py-8 border-b border-slate-100 last:border-0 cursor-default"
            >
              <span className="text-[13px] font-mono text-slate-300 w-6 shrink-0 pt-0.5">{f.num}</span>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1.5 group-hover:text-mentrixa-600 transition-colors duration-200">
                  {f.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed max-w-lg">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ IDENTITY — MENTRIXERS ═══════════ */}
      <section ref={identRef} id="mentrixers" className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-16 py-28">
          <span className="block text-[11px] font-semibold tracking-[0.15em] uppercase text-mentrixa-400 mb-3">
            Two sides. One platform.
          </span>
          <h2 className="font-bold mb-20" style={{ fontSize: "clamp(28px, 3.5vw, 48px)", letterSpacing: "-0.03em" }}>
            Every Mentrixe has a role.
          </h2>

          <div className="grid md:grid-cols-2 gap-px bg-white/[0.06] rounded-xl overflow-hidden">
            {/* Student */}
            <div className="ident-block bg-slate-900 p-10 lg:p-14">
              <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-emerald-400 mb-6 block">
                Student Mentrixe
              </span>
              <h3 className="text-2xl lg:text-3xl font-bold leading-tight mb-3">
                Stop cramming.
              </h3>
              <p className="text-slate-400 mb-8">Start training.</p>
              <ul className="space-y-4 text-sm text-slate-300 mb-10">
                {STUDENT_PERKS.map((p) => (
                  <li key={p} className="flex items-start gap-3">
                    <span className="mt-[5px] w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/signup"
                className="inline-block text-sm font-semibold text-slate-900 bg-white px-7 py-3 rounded-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200"
              >
                Join as student
              </Link>
            </div>

            {/* Tutor */}
            <div className="ident-block bg-slate-900 p-10 lg:p-14">
              <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-mentrixa-400 mb-6 block">
                Tutor Mentrixe
              </span>
              <h3 className="text-2xl lg:text-3xl font-bold leading-tight mb-3">
                Teach your way.
              </h3>
              <p className="text-slate-400 mb-8">Get paid every time.</p>
              <ul className="space-y-4 text-sm text-slate-300 mb-10">
                {TUTOR_PERKS.map((p) => (
                  <li key={p} className="flex items-start gap-3">
                    <span className="mt-[5px] w-1.5 h-1.5 rounded-full bg-mentrixa-400 shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/signup?role=tutor"
                className="inline-block text-sm font-semibold text-slate-900 bg-white px-7 py-3 rounded-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200"
              >
                Join as tutor
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section ref={flowRef} id="how-it-works" className="py-28 px-6 lg:px-16 max-w-7xl mx-auto">
        <span className="block text-[11px] font-semibold tracking-[0.15em] uppercase text-mentrixa-600 mb-3">
          The flow
        </span>
        <h2 className="font-bold text-slate-900 mb-16" style={{ fontSize: "clamp(28px, 3.5vw, 48px)", letterSpacing: "-0.03em" }}>
          How a session works.
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((s) => (
            <div key={s.num} className="flow-step group">
              <span className="block text-[48px] font-bold text-slate-100 leading-none mb-4 group-hover:text-mentrixa-100 transition-colors duration-300">
                {s.num}
              </span>
              <h3 className="text-base font-semibold text-slate-900 mb-2 group-hover:text-mentrixa-600 transition-colors duration-200">
                {s.title}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ SOCIAL PROOF ═══════════ */}
      <section ref={proofRef} className="py-28 px-6 lg:px-16 max-w-7xl mx-auto">
        <span className="block text-[11px] font-semibold tracking-[0.15em] uppercase text-mentrixa-600 mb-3">
          From the community
        </span>
        <h2 className="font-bold text-slate-900 mb-16" style={{ fontSize: "clamp(28px, 3.5vw, 48px)", letterSpacing: "-0.03em" }}>
          Mentrixers talk.
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="proof-card border border-slate-200/80 rounded-xl p-8 bg-white hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
              <p className="text-sm text-slate-600 leading-relaxed mb-8 italic">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div>
                <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ TICKER ═══════════ */}
      <section className="overflow-hidden border-y border-slate-200/60 py-5">
        <div className="flex animate-scroll whitespace-nowrap">
          {[0, 1].map((idx) => (
            <p key={idx} className="mr-16 text-[13px] text-slate-300 font-mono tracking-[0.08em] uppercase shrink-0">
              Algorithms &middot; Calculus &middot; Data Structures &middot; Statistics &middot; Circuits &middot; Networks &middot; Chemistry &middot; Physics &middot; Linear Algebra &middot; Discrete Math &middot;&nbsp;
            </p>
          ))}
        </div>
      </section>

      {/* ═══════════ CTA ═══════════ */}
      <section ref={ctaRef} className="bg-slate-900 text-white">
        <div className="max-w-3xl mx-auto px-6 lg:px-16 py-32 text-center">
          <h2 className="font-bold mb-5" style={{ fontSize: "clamp(32px, 4.5vw, 56px)", letterSpacing: "-0.04em" }}>
            Your next session<br />is waiting.
          </h2>
          <p className="text-slate-400 text-lg mb-12">
            Join the Mentrixers. Free to sign up. Pay only when you book.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/auth/signup"
              className="text-sm font-semibold text-slate-900 bg-white px-9 py-4 rounded-lg shadow-lg shadow-white/10 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200"
            >
              Become a Mentrixe
            </Link>
            <Link
              href="/contact"
              className="text-sm font-semibold text-slate-300 border border-white/15 px-9 py-4 rounded-lg hover:bg-white/5 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="bg-slate-900 border-t border-white/[0.06] py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="text-base font-bold text-white tracking-tight">Mentrixa</span>
            <span className="text-xs text-slate-600">&middot;</span>
            <span className="text-xs text-slate-500">Where Mentrixers level up</span>
          </div>
          <div className="flex items-center gap-8 text-sm text-slate-500">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          </div>
          <p className="text-xs text-slate-600">&copy; {new Date().getFullYear()} Mentrixa</p>
        </div>
      </footer>
    </div>
  );
}

/* ─────────────────────── DATA ─────────────────────── */

const STATS = [
  { value: 500, label: "Mentrixers", suffix: "+" },
  { value: 2400, label: "sessions completed" },
  { value: 4.9, label: "average rating" },
  { value: 89, label: "percent retention", suffix: "%" },
];

const FEATURES = [
  { num: "01", title: "Live 1-on-1 video sessions", desc: "Private peer-to-peer calls. Screen share, camera, mic. No downloads, no third-party apps." },
  { num: "02", title: "AI study packages", desc: "When a session ends, AI generates a full package — summary, key points, flashcards, and follow-up Quests." },
  { num: "03", title: "Mentrixa Quest", desc: "AI-generated practice problems. Coach mode walks you through it. Exam mode tests you. Earn XP with every solve." },
  { num: "04", title: "Divisions and leaderboards", desc: "Compete in your subject. Track streaks. Climb ranks. Your XP history is your proof of work." },
  { num: "05", title: "Instant booking with Stripe", desc: "Browse tutor availability by day, time, and subject. One-click checkout. Confirmed in seconds." },
  { num: "06", title: "Session recordings and archives", desc: "Tutors can record sessions. Students can access every past package and summary. Nothing gets lost." },
];

const STUDENT_PERKS = [
  "Browse expert tutors by subject, time, and price",
  "Join live 1-on-1 video calls with screen sharing",
  "Get AI summaries, flashcards, and follow-up Quests",
  "Earn XP and climb Division leaderboards",
  "Solve AI-generated Quest problems to sharpen skills",
];

const TUTOR_PERKS = [
  "Set your own schedule, price, and subjects",
  "Stripe payouts after every session — no chasing",
  "Auto-approve bookings or review each request",
  "AI Studio generates session packages for you",
  "Track your revenue, ratings, and session history",
];

const STEPS = [
  { num: "01", title: "Browse and book", desc: "Pick your tutor by subject, time, and price. One-click Stripe checkout." },
  { num: "02", title: "Live video session", desc: "Join a private 1-on-1 call. Screen share, camera, mic — no installs." },
  { num: "03", title: "AI package drops", desc: "Session ends. AI creates your summary, flashcards, key points, and Quests." },
  { num: "04", title: "Grind and rank up", desc: "Solve Quests, earn XP, climb your Division leaderboard. Come back." },
];

const TESTIMONIALS = [
  {
    quote: "The AI package after each session captures exactly what we covered. It's like having a personal course log that actually works.",
    name: "Sofia",
    role: "CS major — Student Mentrixe",
  },
  {
    quote: "Found a calculus tutor in five minutes. Video call was smooth and the follow-up Quests kept me on track for midterms.",
    name: "Priya",
    role: "2nd year engineering — Student Mentrixe",
  },
  {
    quote: "I set my schedule, get paid instantly, and the AI handles notes. I just focus on teaching. This platform respects tutors.",
    name: "Daniel",
    role: "Grad algorithms tutor — Tutor Mentrixe",
  },
];
