"use client";

import Link from "next/link";
import { Zap } from "lucide-react";

const PRODUCT_LINKS = [
  { label: "Features", href: "#how-it-works" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Subjects", href: "/student" },
  { label: "Pricing", href: "#" },
];

const TUTOR_LINKS = [
  { label: "Become a Tutor", href: "/auth/signup?role=tutor" },
  { label: "For Tutors", href: "/tutor" },
];

const LEGAL_LINKS = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

export default function Footer() {
  return (
    <footer className="bg-white border-t border-surface-border">
      <div className="section-container py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Logo + tagline */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 mb-3">
              <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 text-white font-bold text-lg">
                M
              </span>
              <span className="font-display font-bold text-text-primary text-lg tracking-tight">
                Mentrixa
              </span>
              <Zap size={16} className="text-brand-500" />
            </Link>
            <p className="text-sm text-text-muted max-w-[200px]">
              AI-powered tutoring. Book sessions, get study packages, level up.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold text-text-primary text-sm mb-4">Product</h3>
            <ul className="space-y-2">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-muted hover:text-text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For Tutors */}
          <div>
            <h3 className="font-semibold text-text-primary text-sm mb-4">For Tutors</h3>
            <ul className="space-y-2">
              {TUTOR_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-muted hover:text-text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="col-span-2 md:col-span-1">
            <h3 className="font-semibold text-text-primary text-sm mb-4">Legal</h3>
            <ul className="space-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-muted hover:text-text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-surface-border">
          <p className="text-text-muted text-xs">
            © {new Date().getFullYear()} Mentrixa. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
