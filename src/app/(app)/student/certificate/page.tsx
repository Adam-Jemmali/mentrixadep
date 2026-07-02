import Link from "next/link";
import { requireRole } from "@/shared/core/auth";
import { loadTrajectoryCertificateForViewer } from "@/features/trajectory-index/load-trajectory-certificate";
import { verifiedPercentileGoldStyle } from "@/features/trajectory-index/trajectory-certificate-pure";
import { Button } from "@/shared/ui/button";
import { PrintCertificateButton } from "@/features/trajectory-index/ui/print-certificate-button";
import { ParentCustodianInvitePanel } from "@/features/parent-custodian/ui/parent-custodian-invite-panel";

export default async function StudentCertificatePage() {
  const certificate = await loadTrajectoryCertificateForViewer();
  if (!certificate) {
    await requireRole(["student", "admin"]);
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-sm text-zinc-600">
          Trajectory certificate export is available to Momentum members.
        </p>
        <Button asChild className="mt-4">
          <Link href="/student/subscribe">View plans</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="certificate-print mx-auto max-w-2xl px-4 py-10 print:py-6">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">
        Trajectory certificate
      </p>
      <h1 className="mt-2 text-2xl font-black text-zinc-900">{certificate.studentName}</h1>
      <p className="mt-1 text-sm text-zinc-600">{certificate.subject}</p>
      <p className="mt-6 text-sm font-semibold text-zinc-900">{certificate.verdict}</p>
      <p className="mt-2 text-sm text-zinc-600">{certificate.nextAction}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 p-4">
          <p className="text-xs uppercase tracking-widest text-zinc-500">Verified percentile</p>
          <p className="mt-1 text-2xl font-black" style={verifiedPercentileGoldStyle()}>
            {certificate.verifiedPercentile != null
              ? `${Math.round(certificate.verifiedPercentile)}th`
              : "Calibrating"}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 p-4">
          <p className="text-xs uppercase tracking-widest text-zinc-500">Trajectory Index</p>
          <p className="mt-1 text-2xl font-black text-indigo-950">
            {certificate.trajectoryScore ?? "—"}
          </p>
        </div>
      </div>
      <p className="mt-4 text-xs text-zinc-500">Generated {certificate.generatedOn}</p>
      <div className="no-print mt-6 flex flex-wrap gap-3">
        <PrintCertificateButton />
        <Button asChild variant="outline">
          <Link href="/student/receipts">Receipt archive</Link>
        </Button>
      </div>
      <ParentCustodianInvitePanel studentFirstName={certificate.studentName} />
    </main>
  );
}
