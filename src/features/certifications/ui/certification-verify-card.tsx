"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { motion, useAnimationControls } from "@/shared/animation/motion";
import { useHydrationSafeMotion } from "@/shared/animation/use-hydration-safe-motion";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { StudentHubPlayfairNumbers } from "@/features/student-home/student-hub-numeric-panel";
import {
  certificationAccuracyLine,
  certificationLiveRecordLine,
  certificationNodesVerifiedLine,
  certificationRankVerifyHint,
  certificationRevokedBody,
  certificationTopPercent,
  formatCertificationIssuedAt,
} from "@/features/certifications/certification-pure";
import type { MentrixaCertificationView } from "@/features/certifications/load-certification";
import { cn } from "@/shared/core/utils";

function StatLine({
  icon,
  text,
  gold = false,
}: {
  icon: "rank-proof" | "verified" | "skills";
  text: string;
  gold?: boolean;
}) {
  return (
    <p className="inline-flex items-start gap-2 text-[14px] leading-snug text-[var(--mx-steel)]">
      <MentrixaVocabIcon
        name={icon}
        size={18}
        surface="light"
        title=""
        gold={gold}
        className="mt-0.5 shrink-0"
      />
      <StudentHubPlayfairNumbers text={text} />
    </p>
  );
}

export function CertificationVerifyCard({
  cert,
  qr,
}: {
  cert: MentrixaCertificationView;
  qr: ReactNode;
}) {
  const revoked = Boolean(cert.revokedAt);
  const { mounted, prefersReducedMotion } = useHydrationSafeMotion();
  const controls = useAnimationControls();
  const topPercentRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!mounted) return;

    const visible = { opacity: 1, y: 0 };
    if (prefersReducedMotion) {
      void controls.set(visible);
      return;
    }

    void controls.set({ opacity: 0, y: 16 });
    void controls.start({
      ...visible,
      transition: { duration: 0.5, ease: "easeOut" },
    });
  }, [controls, mounted, prefersReducedMotion]);

  useEffect(() => {
    if (!mounted || prefersReducedMotion || revoked || !topPercentRef.current) return;

    let cancelled = false;
    const el = topPercentRef.current;
    const end = certificationTopPercent(cert.verifiedPercentile);
    const obj = { val: 0 };

    void import("@/shared/animation/anime").then(({ animate }) => {
      if (cancelled) return;
      el.textContent = "0";
      animate(obj, {
        val: end,
        duration: 900,
        ease: "outExpo",
        onUpdate: () => {
          el.textContent = String(Math.round(obj.val));
        },
      });
    });

    return () => {
      cancelled = true;
    };
  }, [cert.verifiedPercentile, mounted, prefersReducedMotion, revoked]);

  const topPercent = certificationTopPercent(cert.verifiedPercentile);
  const nodesLine = certificationNodesVerifiedLine(cert.nodesVerified, cert.totalNodes);
  const accuracyLine = certificationAccuracyLine(cert.accuracyOverall);

  return (
    <motion.section
      initial={false}
      animate={controls}
      className={cn(
        "rounded-lg border-2 bg-white p-8 shadow-[0_4px_24px_rgba(0,0,0,0.08)] print:shadow-none",
        revoked ? "border-red-400/60" : "border-[var(--mx-gold)]/60",
      )}
      aria-label="Mentrixa certification"
    >
      {revoked ? (
        <p className="text-center text-[14px] leading-relaxed text-red-600">
          {certificationRevokedBody(cert.revokedAt!)}
        </p>
      ) : (
        <>
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--mx-gold)]">
            AP Calculus AB Mastery Certificate
          </p>

          <h1 className="mt-4 text-center font-[family-name:var(--font-playfair),serif] text-[28px] font-bold leading-tight text-[#0A0A0A]">
            {cert.displayName}
          </h1>

          <div className="mt-5 space-y-2.5">
            <p className="inline-flex items-start gap-2 text-[14px] leading-snug text-[var(--mx-steel)]">
              <MentrixaVocabIcon
                name="rank-proof"
                size={18}
                surface="light"
                title=""
                gold
                className="mt-0.5 shrink-0"
              />
              <span>
                Verified top{" "}
                <span
                  ref={topPercentRef}
                  className="font-[family-name:var(--font-playfair),serif] font-bold tabular-nums text-[var(--mx-violet)]"
                >
                  {topPercent}
                </span>{" "}
                percent of all Mentrixers tested
              </span>
            </p>
            <StatLine icon="verified" text={nodesLine} gold />
            <StatLine icon="skills" text={accuracyLine} />
          </div>

          <p className="mt-5 text-center text-[12px] text-[var(--mx-muted)]">
            Issued {formatCertificationIssuedAt(cert.issuedAt)}
          </p>

          <div className="my-6 h-px bg-[var(--mx-gold)]/30" aria-hidden />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 space-y-1.5">
              <p className="inline-flex items-center gap-1.5 text-[11px] text-[var(--mx-muted)]">
                <MentrixaVocabIcon name="receipt" size={14} surface="light" title="" />
                {certificationLiveRecordLine()}
              </p>
              {cert.rankUsername ? (
                <Link
                  href={cert.rankCardUrl ?? `/rank/${encodeURIComponent(cert.rankUsername)}`}
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--mx-violet)] hover:text-[var(--mx-primary-hover)]"
                >
                  <MentrixaVocabIcon name="rank-proof" size={14} surface="light" title="" gold />
                  {certificationRankVerifyHint(cert.rankUsername)}
                </Link>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1.5">
              {qr}
              <p className="max-w-[9rem] break-all text-right font-mono text-[11px] text-[var(--mx-muted)]">
                {cert.verificationToken}
              </p>
            </div>
          </div>
        </>
      )}
    </motion.section>
  );
}
