"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { MentrixaWordmark } from "@/components/mentrixa-wordmark";

const PUBLIC_LINKS = [
  { label: "Features", href: "#how-it-works" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "For Tutors", href: "/auth/signup?role=tutor" },
  { label: "Pricing", href: "#how-it-works" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={cn(
          "fixed top-4 left-1/2 -translate-x-1/2 z-50 h-14 px-4 flex items-center justify-between gap-4",
          "max-w-5xl w-[calc(100%-2rem)] rounded-2xl transition-all duration-300",
          "bg-white/80 backdrop-blur-xl border border-white/60 shadow-float",
          scrolled && "bg-white/95"
        )}
      >
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="font-display font-bold text-xl tracking-tight">
            <span className="bg-gradient-brand bg-clip-text text-transparent">MEN</span>
            <span className="text-text-primary">TRIXA</span>
          </span>
      
        </Link>

        <nav className="hidden md:flex items-center gap-0.5">
          {PUBLIC_LINKS.map((item) =>
            item.href.startsWith("#") ? (
              <a
                key={item.label}
                href={item.href}
                className="text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-lg hover:bg-surface-hover text-sm font-medium transition-colors"
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.label}
                href={item.href}
                className="text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-lg hover:bg-surface-hover text-sm font-medium transition-colors"
              >
                {item.label}
              </Link>
            )
          )}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <Link href="/auth/signup" className="btn-primary hidden md:inline-flex">
            Get Started
          </Link>
          <button
            type="button"
            className="md:hidden p-2 rounded-lg text-text-secondary hover:bg-surface-hover"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              initial={{ x: 288 }}
              animate={{ x: 0 }}
              exit={{ x: 288 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 h-full w-72 bg-white/95 backdrop-blur-xl shadow-float z-50 md:hidden flex flex-col"
            >
              <div className="p-6 border-b border-surface-border flex justify-between items-center">
                <Link href="/" className="flex items-center gap-2" onClick={() => setDrawerOpen(false)}>
                  <MentrixaWordmark className="text-xl" />
                </Link>
                <button type="button" onClick={() => setDrawerOpen(false)} className="p-2">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 py-6">
                {PUBLIC_LINKS.map((item) =>
                  item.href.startsWith("#") ? (
                    <a
                      key={item.label}
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                      className="block px-6 py-3 text-text-primary hover:bg-surface-hover text-sm font-medium"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                      className="block px-6 py-3 text-text-primary hover:bg-surface-hover text-sm font-medium"
                    >
                      {item.label}
                    </Link>
                  )
                )}
              </div>
              <div className="p-6 border-t border-surface-border">
                <Link
                  href="/auth/signup"
                  className="btn-primary w-full text-center block"
                  onClick={() => setDrawerOpen(false)}
                >
                  Get Started
                </Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
