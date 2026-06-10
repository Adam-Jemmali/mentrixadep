"use client";

import { motion } from "framer-motion";

const STEPS = [
  { num: 1, title: "Find my  tutor", desc: "Browse by subject and pick an expert with availability that fits your schedule." },
  { num: 2,title: "Book & pay & forget", desc: "Reserve your slot securely with Stripe. One-click booking." },
  { num: 3,title: "Video session", desc: "Join a live 1-on-1 call. Share your screen, get real-time help." },
  { num: 4,title: "Mentrixa package + XP", desc: "Get a summary, flashcards, and follow-up quests. Earn XP and climb the leaderboard against other Mentrixas." },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const block = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 lg:py-32 relative">
      <motion.div
        className="section-container"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
        variants={container}
      >
        <motion.div variants={block} className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold mb-4">
            THe  4  step process
          </span>
          <h2 className="section-heading text-4xl lg:text-5xl">How Mentrixa works</h2>
        </motion.div>

        <div className="relative">
          {/* Connecting dashed line - desktop */}
          <div className="hidden md:block absolute left-0 right-0 top-1/2 -translate-y-px border-t border-dashed border-brand-200 pointer-events-none z-0" />

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
          {STEPS.map((step) => (
            <motion.div
              key={step.num}
              variants={block}
              className="glass rounded-2xl p-6 card-hover relative"
            >
              <span className="absolute top-4 right-4 font-display text-5xl font-bold text-brand-100 pointer-events-none">
                {step.num}
              </span>
            
              <h3 className="font-semibold text-text-primary mb-2">{step.title}</h3>
              <p className="text-text-muted text-sm leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
