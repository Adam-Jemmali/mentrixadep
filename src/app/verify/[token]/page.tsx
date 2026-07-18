import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadCertificationByToken } from "@/features/certifications/load-certification";
import { CertificationVerifyCard } from "@/features/certifications/ui/certification-verify-card";
import { CertificationPrintTrigger } from "@/features/certifications/ui/certification-print-trigger";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import Link from "next/link";
import {
  certificationPeerStandingLabel,
} from "@/features/certifications/certification-pure";

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ print?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const cert = await loadCertificationByToken(token);
  if (!cert) return { title: "Verify · Mentrixa" };
  const peer = certificationPeerStandingLabel(cert.verifiedPercentile);
  return {
    title: `${cert.displayName} · ${peer} · Mentrixa`,
    description: `${cert.subject} certification. Live record.`,
  };
}

export default async function VerifyCertificationPage({ params, searchParams }: Props) {
  const { token } = await params;
  const query = await searchParams;
  const cert = await loadCertificationByToken(token);
  if (!cert) notFound();

  return (
    <main className="min-h-dvh bg-[#0B1220] text-slate-100">
      {query.print === "1" ? <CertificationPrintTrigger /> : null}
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-white/15 bg-white/5 px-4 py-3 print:hidden">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#D4A017]">
            <MentrixaVocabIcon name="passport" size={22} surface="dark" title="Mentrixa" gold />
            Mentrixa
          </span>
          <Link href="/" className="text-sm font-medium text-violet-300 hover:text-white">
            Home
          </Link>
        </div>
        <CertificationVerifyCard cert={cert} />
      </div>
    </main>
  );
}
