"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import {
  CERT_ISSUE_PEER_STANDING,
  CERT_MIN_VFA_STREAK_DAYS,
  CERT_NODE_COVERAGE_RATIO,
  certificationPeerStandingLabel,
  certificationShareEmptyVerdict,
  certificationShareNextAction,
  certificationVerifyPath,
  formatCertificationIssuedAt,
} from "@/features/certifications/certification-pure";
import type { MentrixaCertificationView } from "@/features/certifications/load-certification";
import { Button } from "@/shared/ui/button";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { mentrixHubSurfaces } from "@/features/student-profile/student-hub-surfaces";
import { cn } from "@/shared/core/utils";

export function CertificationSettingsPanel({
  cert,
}: {
  cert: MentrixaCertificationView | null;
}) {
  const [copied, setCopied] = useState(false);

  const copyLink = useCallback(async () => {
    if (!cert) return;
    try {
      await navigator.clipboard.writeText(cert.verifyUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }, [cert]);

  if (!cert) {
    return (
      <section
        className={cn(mentrixStudent.hubSticky, "rotate-0 p-5 sm:p-8")}
        aria-label="Mentrixa Certification"
      >
        <div className="mb-4 space-y-3">
          <h2 className="inline-flex items-center gap-2.5">
            <MentrixaVocabIcon name="passport" size={22} surface="light" title="Certification" gold />
            <span className={cn(mentrixHubSurfaces.inkTitle, "text-lg sm:text-xl")}>
              Mentrixa Certification
            </span>
          </h2>
          <p className={cn(mentrixHubSurfaces.inkBody, "max-w-md text-sm leading-relaxed")}>
            {certificationShareEmptyVerdict()}
          </p>
        </div>

        <div className="rounded-lg border border-violet-300 bg-white/75 p-4 text-sm text-[#475569]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--mx-indigo)]">
            Required to issue
          </p>
          <ul className="mt-3 space-y-2">
            <li className="inline-flex items-start gap-2">
              <MentrixaVocabIcon name="rank-proof" size={18} surface="light" title="" gold />
              Peer standing {certificationPeerStandingLabel(CERT_ISSUE_PEER_STANDING)} or better
            </li>
            <li className="inline-flex items-start gap-2">
              <MentrixaVocabIcon name="verified" size={18} surface="light" title="" gold />
              {Math.round(CERT_NODE_COVERAGE_RATIO * 100)}% of AP Calculus AB skill nodes verified
            </li>
            <li className="inline-flex items-start gap-2">
              <MentrixaVocabIcon name="day" size={18} surface="light" title="" />
              {CERT_MIN_VFA_STREAK_DAYS} day verified first answer streak
            </li>
          </ul>
        </div>

        <p className={cn(mentrixHubSurfaces.inkMuted, "mt-5 text-xs leading-relaxed")}>
          {certificationShareNextAction()}
        </p>
      </section>
    );
  }

  const revoked = Boolean(cert.revokedAt);
  const peer = certificationPeerStandingLabel(cert.verifiedPercentile);
  const verifyPath = certificationVerifyPath(cert.verificationToken);

  return (
    <section
      className={cn(mentrixStudent.hubSticky, "rotate-0 p-5 sm:p-8")}
      aria-label="Mentrixa Certification"
    >
      <div className="mb-6 space-y-3">
        <h2 className="inline-flex items-center gap-2.5">
          <MentrixaVocabIcon name="passport" size={22} surface="light" title="Certification" gold />
          <span className={cn(mentrixHubSurfaces.inkTitle, "text-lg sm:text-xl")}>
            Mentrixa Certification
          </span>
        </h2>
        <p className={cn(mentrixHubSurfaces.inkBody, "max-w-md text-sm leading-relaxed")}>
          Resume grade proof. Live verification page with QR code and PDF download.
        </p>
      </div>

      <div className="mb-6 rounded-lg border border-[var(--mx-gold)]/40 bg-white/75 p-4 sm:p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--mx-gold)]">
          AP Calculus AB Mastery Certificate
        </p>
        <p className="mt-2 text-sm font-semibold text-[var(--mx-navy)]">
          {revoked ? "Suspended" : `${cert.subject}. ${peer}`}
        </p>
        <div className="mt-3 grid gap-2 text-sm text-[#475569] sm:grid-cols-2">
          <p className="inline-flex items-center gap-2">
            <MentrixaVocabIcon name="verified" size={18} surface="light" title="Nodes" gold />
            {cert.nodesVerified}/{cert.totalNodes} nodes
          </p>
          <p className="inline-flex items-center gap-2">
            <MentrixaVocabIcon name="day" size={18} surface="light" title="Issued" />
            Issued {formatCertificationIssuedAt(cert.issuedAt)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <Button type="button" asChild className={mentrixStudent.hubBtnSolid}>
          <Link href={verifyPath} target="_blank" rel="noopener noreferrer">
            View certificate
          </Link>
        </Button>
        <Button type="button" onClick={() => void copyLink()} className={mentrixHubSurfaces.ghostLink}>
          {copied ? "Link copied" : "Copy verification link"}
        </Button>
        <Button type="button" variant="ghost" asChild className={mentrixHubSurfaces.ghostLink}>
          <Link href={`${verifyPath}?print=1`} target="_blank" rel="noopener noreferrer">
            Download PDF
          </Link>
        </Button>
      </div>

      <div className="mt-6 flex items-start gap-3 border-t border-violet-300/70 pt-5">
        <MentrixaVocabIcon name="receipt" size={28} surface="light" className="shrink-0 opacity-80" />
        <p className={cn(mentrixHubSurfaces.inkMuted, "text-xs leading-relaxed")}>
          Anyone with the link sees the live certificate page. Pair it with your public rank card for full proof.
        </p>
      </div>
    </section>
  );
}
