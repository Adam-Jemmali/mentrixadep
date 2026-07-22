"use client";

import { HubVocabIcon } from "@/features/student-profile/ui/hub-vocab-icon";
import {
  guideWrappedStatLines,
  studentWrappedStatLines,
  wrappedHeadline,
  type WrappedReportData,
} from "@/features/wrapped/wrapped-pure";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";

function asVocabIcon(name: string): VocabIconName {
  return name as VocabIconName;
}

export function WrappedReportCard({
  reportYear,
  role,
  data,
  sharePath,
}: {
  reportYear: number;
  role: "student" | "tutor";
  data: WrappedReportData;
  sharePath?: string | null;
}) {
  const lines =
    data.kind === "student" ? studentWrappedStatLines(data) : guideWrappedStatLines(data);

  return (
    <section className={`${mentrixStudent.card} p-5 sm:p-6`} aria-label="Annual Wrapped">
      <div className="flex items-center gap-2">
        <HubVocabIcon name="passport" title="Wrapped" size={32} />
        <div>
          <p className={mentrixStudent.sectionEyebrowOnLight}>{wrappedHeadline(role, reportYear)}</p>
          <p className="mt-1 text-sm font-medium text-zinc-700">Permanence. Proof. Your year locked.</p>
        </div>
      </div>

      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {lines.map((line) => (
          <li
            key={`${line.label}-${line.value}`}
            className="flex items-start gap-3 rounded-xl border border-violet-100 bg-violet-50/50 px-3 py-3"
          >
            <HubVocabIcon name={asVocabIcon(line.icon)} title={line.label} size={28} />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                {line.label}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-zinc-900">{line.value}</p>
            </div>
          </li>
        ))}
      </ul>

      {sharePath ? (
        <p className="mt-4 text-xs text-zinc-500">
          Share. <span className="font-mono text-zinc-700">{sharePath}</span>
        </p>
      ) : null}
    </section>
  );
}
