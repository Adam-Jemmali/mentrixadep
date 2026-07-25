import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MentrixaWordmark } from "@/components/mentrixa-wordmark";
import { loadCertificationByToken } from "@/features/certifications/load-certification";
import { CertificationVerifyCard } from "@/features/certifications/ui/certification-verify-card";
import { CertificationVerifyActions } from "@/features/certifications/ui/certification-verify-actions";
import { CertificationPrintTrigger } from "@/features/certifications/ui/certification-print-trigger";
import { CertificationQrImage } from "@/features/certifications/ui/certification-qr-image";
import { certificationPeerStandingLabel } from "@/features/certifications/certification-pure";

type Props = {
  params: Promise<{ verification_token: string }>;
  searchParams: Promise<{ print?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { verification_token } = await params;
  const cert = await loadCertificationByToken(verification_token);
  if (!cert) return { title: "Verify. Mentrixa" };
  const peer = certificationPeerStandingLabel(cert.verifiedPercentile);
  return {
    title: `${cert.displayName}. ${peer}. Mentrixa`,
    description: `${cert.subject} certification. Live record.`,
  };
}

export default async function VerifyCertificationPage({ params, searchParams }: Props) {
  const { verification_token } = await params;
  const query = await searchParams;
  const cert = await loadCertificationByToken(verification_token);
  if (!cert) notFound();

  const qrUrl = cert.rankCardUrl ?? cert.verifyUrl;

  return (
    <main className="min-h-dvh bg-white text-[#0B1220] print:bg-white">
      {query.print === "1" ? <CertificationPrintTrigger /> : null}
      <div className="mx-auto max-w-[480px] px-4 pb-16 pt-10 sm:px-6 print:px-0 print:pb-0 print:pt-0">
        <header className="mb-8 text-center print:mb-6">
          <MentrixaWordmark className="justify-center text-lg" />
          <p className="mt-1 text-[12px] text-[#9CA3AF]">Certification Verification</p>
        </header>

        <CertificationVerifyCard
          cert={cert}
          qr={<CertificationQrImage url={qrUrl} />}
        />

        <CertificationVerifyActions cert={cert} />
      </div>
    </main>
  );
}
