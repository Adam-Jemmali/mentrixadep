"use client";

import Link from "next/link";
import { motion } from "@/shared/animation/motion";
import type { Verdict } from "@/features/guidance/verdict-engine-pure";
import type { ApReadinessBandView } from "@/features/student-home/ap-readiness-band-pure";
import { ApReadinessBand } from "@/features/student-home/ap-readiness-band";
import { cn } from "@/shared/core/utils";

export function StudentVerdictHero({
  verdict,
  fallbackLine,
  apBand,
  className,
}: {
  verdict: Verdict | null;
  fallbackLine: string;
  apBand: ApReadinessBandView;
  className?: string;
}) {
  const line = verdict?.changed ?? fallbackLine;
  const cta = verdict?.nextAction ?? { label: "Open Quest", href: "/student/quest" };

  return (
    <section
      className={cn(
        "rounded-[var(--radius-card)] bg-[var(--mx-navy)] px-4 py-6 sm:px-6 sm:py-8",
        className,
      )}
      aria-label="Your verified rank verdict"
    >
      <p
        className="max-w-[600px] font-[family-name:var(--font-playfair),serif] italic leading-snug text-white"
        style={{ fontSize: "clamp(20px, 3vw, 28px)" }}
      >
        {line}
      </p>

      <div className="mt-4">
        <ApReadinessBand band={apBand} />
      </div>

      <motion.div
        className="mt-5"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: "spring", stiffness: 400, damping: 22 }}
      >
        <Link
          href={cta.href}
          className="inline-flex items-center justify-center rounded-[var(--radius-card)] bg-[var(--mx-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--mx-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mx-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mx-navy)]"
        >
          {cta.label}
        </Link>
      </motion.div>
    </section>
  );
}
