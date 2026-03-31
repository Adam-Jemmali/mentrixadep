"use client";

import { motion } from "framer-motion";

export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="max-w-sm w-full glass rounded-3xl p-8 shadow-float"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30, duration: 0.5 }}
    >
      {children}
    </motion.div>
  );
}
