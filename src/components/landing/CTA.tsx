"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function CTA() {
  return (
    <section className="relative py-24 lg:py-32 overflow-hidden bg-gradient-brand">
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-white/5 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-white/10 blur-2xl pointer-events-none" />

      <motion.div
        className="section-container relative z-10 text-center"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
      >
        <h2 className="font-display text-4xl lg:text-5xl font-bold text-white mb-8">
          Ready to level up?
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white text-brand-600 font-semibold text-base shadow-lg hover:shadow-xl transition-shadow"
            >
              Get Started Free
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link
              href="/student"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl border-2 border-white/20 text-white font-semibold text-base hover:bg-white/10 transition-colors"
            >
              View Demo
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
