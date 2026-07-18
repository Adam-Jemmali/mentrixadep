"use client";

import Link from "next/link";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import {
  certificationLiveRecordLine,
  certificationPeerStandingLabel,
  formatCertificationIssuedAt,
} from "@/features/certifications/certification-pure";
import type { MentrixaCertificationView } from "@/features/certifications/load-certification";

function Stat({
  icon,
  label,
  value,
  gold = false,
}: {
  icon: "verified" | "rank-proof" | "skills" | "passport" | "day";
  label: string;
  value: string;
  gold?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
      <MentrixaVocabIcon name={icon} size={24} surface="dark" title={label} gold={gold} />
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
        <p className={`mt-0.5 text-sm font-bold ${gold ? "text-[#D4A017]" : "text-white"}`}>{value}</p>
      </div>
    </div>
  );
}

export function CertificationVerifyCard({ cert }: { cert: MentrixaCertificationView }) {
  const revoked = Boolean(cert.revokedAt);
  const peer = certificationPeerStandingLabel(cert.verifiedPercentile);

  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0F172A] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
      <div className="border-b border-white/10 bg-gradient-to-br from-[#070d1a] via-[#0B1220] to-[#0F172A] px-5 py-6 sm:px-7">
        <div className="flex items-center gap-2">
          <MentrixaVocabIcon name="passport" size={28} surface="dark" title="Certification" gold />
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#D4A017]">
            Mentrixa Certification
          </p>
        </div>
        <h1 className="mt-3 text-2xl font-black text-white sm:text-3xl">{cert.displayName}</h1>
        <p className="mt-1 text-sm font-medium text-[#C7D2FE]">{cert.subject}</p>
      </div>

      {revoked ? (
        <div className="border-b border-amber-400/30 bg-amber-950/40 px-5 py-4 sm:px-7">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-amber-100">
            <MentrixaVocabIcon name="focus-ring" size={20} surface="dark" title="Suspended" />
            Suspended. Regain peer standing to reinstate.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-7">
        <Stat icon="rank-proof" label="Peer standing" value={peer} gold />
        <Stat
          icon="verified"
          label="Nodes verified"
          value={`${cert.nodesVerified} / ${cert.totalNodes}`}
          gold
        />
        <Stat icon="skills" label="Accuracy" value={`${Math.round(cert.accuracyOverall)}%`} />
        <Stat icon="day" label="Issued" value={formatCertificationIssuedAt(cert.issuedAt)} />
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <p className="inline-flex items-center gap-2 text-sm text-slate-300">
          <MentrixaVocabIcon name="receipt" size={20} surface="dark" title="Live" />
          {certificationLiveRecordLine()}
        </p>
        {cert.rankCardUrl ? (
          <Link
            href={cert.rankCardUrl}
            className="inline-flex items-center gap-2 text-sm font-semibold text-violet-300 hover:text-white"
          >
            <MentrixaVocabIcon name="rank-proof" size={18} surface="dark" title="Rank" gold />
            Public rank card
          </Link>
        ) : null}
      </div>
    </section>
  );
}
