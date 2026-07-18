import { notFound } from "next/navigation";
import { requireRole } from "@/shared/core/auth";
import { loadWrappedForOwner } from "@/features/wrapped/load-wrapped";
import { WrappedReportCard } from "@/features/wrapped/ui/wrapped-report-card";
import { wrappedSharePath } from "@/features/wrapped/wrapped-pure";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";

type Props = { params: Promise<{ year: string }> };

export default async function GuideWrappedPage({ params }: Props) {
  const user = await requireRole(["tutor", "admin"]);
  const { year: yearRaw } = await params;
  const year = Number(yearRaw);
  if (!Number.isFinite(year) || year < 2024 || year > 2100) notFound();

  const report = await loadWrappedForOwner(user.id, year);
  if (!report || report.role !== "tutor") {
    return (
      <main className={mentrixStudent.main}>
        <p className="text-sm text-zinc-600">No Guide Wrapped for {year} yet.</p>
      </main>
    );
  }

  return (
    <main className={mentrixStudent.main}>
      <WrappedReportCard
        reportYear={report.reportYear}
        role="tutor"
        data={report.reportData}
        sharePath={wrappedSharePath(report.shareToken)}
      />
    </main>
  );
}
