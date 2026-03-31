"use client";

import { motion } from "framer-motion";

const TESTIMONIALS = [
  {
    name: "Alex M.",
    initials: "AM",
    quote: "The AI study package after each session actually helped me retain way more than my old notes. Division leaderboard got me to show up every week.",
    year: "2nd year CS, uOttawa",
  },
  {
    name: "Priya K.",
    initials: "PK",
    quote: "Found a calculus tutor in under five minutes. The video call was smooth and the follow-up quests kept me on track for the midterm.",
    year: "2nd year CS, uOttawa",
  },
  {
    name: "Jordan L.",
    initials: "JL",
    quote: "Finally a platform that doesn’t feel like a template. Real tutors, real sessions, and the XP system makes studying less lonely.",
    year: "2nd year CS, uOttawa",
  },
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

export default function Testimonials() {
  return (
    <section className="py-24 bg-gradient-warm relative overflow-hidden">
      <motion.div
        className="section-container relative"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
        variants={container}
      >
        <motion.div variants={block} className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="section-heading text-4xl lg:text-5xl">What students say</h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <motion.div
              key={t.name}
              variants={block}
              className="glass rounded-2xl p-6 card-hover"
            >
              <p className="text-sm text-amber-500 mb-3" aria-hidden>⭐⭐⭐⭐⭐</p>
              <p className="text-text-secondary italic text-sm leading-relaxed mb-6">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  {t.initials}
                </div>
                <div>
                  <p className="font-semibold text-text-primary text-sm">{t.name}</p>
                  <p className="text-text-muted text-xs">{t.year}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
