"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import {
  certificationPeerStandingLabel,
  formatCertificationIssuedAt,
} from "@/features/certifications/certification-pure";
import type { MentrixaCertificationView } from "@/features/certifications/load-certification";
import { Button } from "@/shared/ui/button";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";

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

  if (!cert) return null;

  const revoked = Boolean(cert.revokedAt);
  const peer = certificationPeerStandingLabel(cert.verifiedPercentile);

  return (
    <section className={`${mentrixStudent.card} mt-8 p-5 sm:p-6`} aria-label="Mentrixa Certification">
      <div className="flex items-center gap-2">
        <MentrixaVocabIcon name="passport" size={28} surface="light" title="Certification" gold />
        <div>
          <p className={mentrixStudent.sectionEyebrowOnLight}>Mentrixa Certification</p>
          <p className="mt-1 text-sm font-medium text-zinc-700">
            {revoked ? "Suspended" : `${cert.subject} · ${peer}`}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-zinc-800 sm:grid-cols-2">
        <p className="inline-flex items-center gap-2">
          <MentrixaVocabIcon name="verified" size={18} surface="light" title="Nodes" gold />
          {cert.nodesVerified}/{cert.totalNodes} nodes
        </p>
        <p className="inline-flex items-center gap-2">
          <MentrixaVocabIcon name="day" size={18} surface="light" title="Issued" />
          Issued {formatCertificationIssuedAt(cert.issuedAt)}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={() => void copyLink()}
          className={mentrixStudent.hubBtnSolid}
        >
          {copied ? "Link copied" : "Share link"}
        </Button>
        <Button type="button" variant="outline" asChild className="rounded-xl">
          <Link href={`${cert.verifyUrl}?print=1`} target="_blank" rel="noopener noreferrer">
            Download PDF
          </Link>
        </Button>
      </div>
    </section>
  );
}
