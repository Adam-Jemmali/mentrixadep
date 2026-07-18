import { notFound } from "next/navigation";
import { loadWrappedByShareToken } from "@/features/wrapped/load-wrapped";
import { WrappedReportCard } from "@/features/wrapped/ui/wrapped-report-card";

type Props = { params: Promise<{ token: string }> };

export default async function PublicWrappedPage({ params }: Props) {
  const { token } = await params;
  const report = await loadWrappedByShareToken(token);
  if (!report) notFound();

  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-[#F8F7FC] px-4 py-10">
      <WrappedReportCard
        reportYear={report.reportYear}
        role={report.role}
        data={report.reportData}
      />
    </main>
  );
}
