"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const SUBJECTS = [
  { emoji: "🧮", name: "Algorithms", href: "/student" },
  { emoji: "∫", name: "Calculus", href: "/student" },
  { emoji: "{ }", name: "Data Structures", href: "/student" },
  { emoji: "🧪", name: "Chemistry", href: "/student" },
  { emoji: "📊", name: "Statistics", href: "/student" },
  { emoji: "🔌", name: "Circuits", href: "/student" },
  { emoji: "💡", name: "Physics", href: "/student" },
  { emoji: "🌐", name: "Networks", href: "/student" },
];

export default function Categories() {
  return (
    <section className="py-24 lg:py-32">
      <motion.div
        className="section-container"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="section-heading text-center mb-12">Every subject. Expert tutors.</h2>

        <motion.div
          className="flex gap-4 overflow-x-auto no-scrollbar pb-2"
          initial={{ x: 24 }}
          whileInView={{ x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {SUBJECTS.map((sub, i) => (
            <motion.div
              key={sub.name}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                href={sub.href}
                className="flex items-center gap-2 px-5 py-3 bg-white rounded-2xl shadow-card border border-surface-border hover:border-brand-300 hover:shadow-glow-sm transition-all cursor-pointer whitespace-nowrap flex-shrink-0"
              >
                <span className="text-lg" aria-hidden>{sub.emoji}</span>
                <span className="font-medium text-text-primary">{sub.name}</span>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
