"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MentrixaWordmark } from "@/components/mentrixa-wordmark";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

const AVATARS = ["A", "B", "C", "D", "E"];

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-warm">
      {/* Mesh pattern */}
      <div
        className="absolute inset-0 opacity-60 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(ellipse at 20% 50%, rgba(37,99,235,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(79,70,229,0.06) 0%, transparent 60%)`,
        }}
      />
      {/* Decorative circles */}
      <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-brand-100 to-brand-200/30 blur-3xl pointer-events-none animate-float" />
      <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full bg-brand-400/10 blur-3xl pointer-events-none animate-float [animation-delay:1000ms]" />

      <div className="relative z-10 section-container py-24 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* LEFT COLUMN */}
          <div className="max-w-xl">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-50 border border-brand-200 rounded-full text-brand-700 text-xs font-semibold mb-8"
            >
             The revolutional tutoring platform
            </motion.div>

            <motion.div variants={container} initial="hidden" animate="show" className="space-y-4 mb-6">
              <motion.h1
                variants={item}
                className="text-5xl lg:text-7xl font-display font-bold leading-[1.05] tracking-tight text-text-primary"
              >
                Learn smarter.
              </motion.h1>
              <motion.h1
                variants={item}
                className="text-5xl lg:text-7xl font-display font-bold leading-[1.05] tracking-tight bg-gradient-brand bg-clip-text text-transparent"
              >
                Level up faster.
              </motion.h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-text-secondary text-lg lg:text-xl leading-relaxed max-w-md mb-10"
            >
              Book expert tutors, get AI-powered study packages after every session, and track your progress through gamified Divisions.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap items-center gap-4 mb-10"
            >
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/auth/signup"
                  className="btn-primary text-base px-8 py-4 rounded-2xl shadow-glow hover:shadow-glow-lg inline-flex items-center gap-2"
                >
                  Join <MentrixaWordmark className="text-base text-white [&_span]:text-white" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link href="/auth/signup?role=tutor" className="btn-ghost text-base">
                  For Mentrixas →
                </Link>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center gap-4"
            >
              <div className="flex -space-x-2">
                {AVATARS.map((letter, i) => (
                  <div
                    key={letter}
                    className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-bold border-2 border-white"
                    style={{ marginLeft: i > 0 ? -8 : 0 }}
                  >
                    {letter}
                  </div>
                ))}
              </div>
              <p className="text-text-muted text-sm">
                ⭐ 4.9 Trusted by 200+ Mentrixas
              </p>
            </motion.div>
          </div>

          {/* RIGHT COLUMN: 3D card stack */}
          <div className="relative hidden lg:block h-[420px]">
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* Card 1 - back */}
              <motion.div
                className="absolute w-64 h-72 rounded-2xl glass overflow-hidden border border-white/60 shadow-float"
                style={{
                  transform: "rotate(6deg) translateY(16px) translateX(16px)",
                  left: "50%",
                  top: "50%",
                  marginLeft: -128,
                  marginTop: -144,
                }}
                whileHover={{ scale: 1.02, rotate: 0 }}
              >
                <div className="p-4 h-full flex flex-col bg-white/90">
                  <div className="text-xs font-semibold text-brand-600 mb-2">Quest Workspace</div>
                  <div className="flex-1 rounded-lg bg-brand-50/50 border border-brand-100 p-3 space-y-2">
                    <div className="h-2 rounded bg-brand-200/60 w-3/4" />
                    <div className="h-2 rounded bg-brand-200/40 w-full" />
                    <div className="h-2 rounded bg-brand-200/40 w-5/6" />
                  </div>
                  <div className="mt-2 h-8 rounded-lg bg-brand-100 w-20" />
                </div>
              </motion.div>

              {/* Card 2 - middle */}
              <motion.div
                className="absolute w-64 h-72 rounded-2xl glass overflow-hidden border border-white/60 shadow-float"
                style={{
                  transform: "rotate(-3deg) translateY(8px) translateX(-8px)",
                  left: "50%",
                  top: "50%",
                  marginLeft: -128,
                  marginTop: -144,
                }}
                whileHover={{ scale: 1.02, rotate: 0 }}
              >
                <div className="p-4 h-full flex flex-col bg-white/90">
                  <div className="text-xs font-semibold text-brand-600 mb-2">Quest Study Package</div>
                  <div className="flex-1 rounded-lg bg-surface-muted/50 p-3 space-y-2">
                    <div className="h-3 rounded bg-brand-100 w-full" />
                    <div className="flex gap-1">
                      <div className="h-8 flex-1 rounded bg-brand-50" />
                      <div className="h-8 flex-1 rounded bg-brand-50" />
                    </div>
                    <div className="h-3 rounded bg-brand-100/60 w-2/3" />
                  </div>
                </div>
              </motion.div>

              {/* Card 3 - front */}
              <motion.div
                className="absolute w-64 h-72 rounded-2xl glass overflow-hidden border border-white/60 shadow-float"
                style={{
                  left: "50%",
                  top: "50%",
                  marginLeft: -128,
                  marginTop: -144,
                }}
                whileHover={{ scale: 1.02, rotate: 0 }}
              >
                <div className="p-4 h-full flex flex-col bg-white/90">
                  <div className="text-xs font-semibold text-brand-600 mb-2">Division Leaderboard</div>
                  <div className="flex-1 rounded-lg bg-surface-muted/50 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-16 rounded bg-amber-100" />
                      <div className="h-3 w-12 rounded bg-brand-200/50" />
                    </div>
                    <div className="space-y-1.5">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="h-5 w-5 rounded-full bg-brand-200" />
                          <div className="h-2 flex-1 rounded bg-brand-100/60" />
                          <div className="h-2 w-8 rounded bg-brand-100/40" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
