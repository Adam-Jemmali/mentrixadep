"use client";

import { Download, Star } from "lucide-react";
import type { UsageReportRow } from "@/app/actions/institution";

function exportCsv(name: string, report: UsageReportRow[]) {
  const headers = [
    "Email",
    "Name",
    "Sessions",
    "Subjects",
    "Tutors used",
    "Avg rating",
    "Total spent ($)",
  ];
  const rows = report.map((r) => [
    r.student_email,
    r.student_name ?? "",
    r.session_count,
    `"${r.subjects.replace(/"/g, '""')}"`,
    r.tutors_used,
    r.avg_rating ?? "",
    (r.total_spent_cents / 100).toFixed(2),
  ]);

  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.replace(/\s+/g, "-")}-usage.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function fmtDollar(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function InstitutionUsageClient({
  institutionId: _institutionId,
  name,
  report,
}: {
  institutionId: string;
  name: string;
  report: UsageReportRow[];
}) {
  const totalSessions = report.reduce((s, r) => s + r.session_count, 0);
  const totalSpent = report.reduce((s, r) => s + r.total_spent_cents, 0);
  const avgRatings = report.filter((r) => r.avg_rating !== null).map((r) => r.avg_rating!);
  const overallRating =
    avgRatings.length > 0
      ? Math.round((avgRatings.reduce((a, b) => a + b, 0) / avgRatings.length) * 10) / 10
      : null;

  return (
    <div className="space-y-6 max-w-[960px]">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[15px] font-semibold text-slate-900">Usage report</h1>
          <p className="text-[12px] text-slate-400 mt-0.5">Session activity per student, all time</p>
        </div>
        <button
          type="button"
          onClick={() => exportCsv(name, report)}
          className="flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium text-slate-700 border border-[#E5E7EB] bg-white rounded-md hover:bg-slate-50 transition-colors"
        >
          <Download className="w-3.5 h-3.5" strokeWidth={2} />
          Export CSV
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total sessions", value: totalSessions.toLocaleString() },
          { label: "Total spend", value: fmtDollar(totalSpent) },
          {
            label: "Avg rating",
            value: overallRating ? `${overallRating} ★` : "—",
          },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border border-[#E5E7EB] rounded-lg p-4">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">{label}</p>
            <p className="text-xl font-semibold text-slate-900 tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
        {report.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-[12px] text-slate-400">No session data yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#FAFAFA] border-b border-[#E5E7EB]">
                <tr>
                  {["Student", "Sessions", "Subjects", "Tutors", "Avg Rating", "Spend"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F9FAFB]">
                {report
                  .sort((a, b) => b.session_count - a.session_count)
                  .map((row) => (
                    <tr
                      key={row.student_email}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="text-[12px] font-medium text-slate-800">{row.student_name ?? row.student_email}</p>
                        {row.student_name && (
                          <p className="text-[11px] text-slate-400">{row.student_email}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-slate-700 tabular-nums">{row.session_count}</td>
                      <td className="px-4 py-3">
                        <p className="text-[11px] text-slate-600 max-w-[180px] truncate" title={row.subjects}>
                          {row.subjects || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-slate-700 tabular-nums">{row.tutors_used}</td>
                      <td className="px-4 py-3">
                        {row.avg_rating ? (
                          <span className="inline-flex items-center gap-1 text-[12px] text-amber-600 font-medium">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {row.avg_rating}
                          </span>
                        ) : (
                          <span className="text-[12px] text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-slate-700 tabular-nums">
                        {fmtDollar(row.total_spent_cents)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
