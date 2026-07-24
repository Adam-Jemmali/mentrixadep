"use client";

import type { GuideActiveStudent } from "@/features/tutor/guide-home-pure";
import { formatDateInZone } from "@/shared/core/time-format";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { CANONICAL_PROFILE_ICON, CANONICAL_SESSION_ICON } from "@/shared/icons/vocab-canonical";
import { GUIDE_HOME } from "@/features/tutor/guide-home-copy-pure";
import { DataTable, type DataTableColumn } from "@/components/ui";

export function GuideRosterTable({
  students,
  displayTimeZone,
}: {
  students: GuideActiveStudent[];
  displayTimeZone: string;
}) {
  const columns: DataTableColumn<GuideActiveStudent>[] = [
    {
      id: "name",
      header: (
        <span className="inline-flex items-center gap-1.5">
          <MentrixaVocabIcon name={CANONICAL_PROFILE_ICON} size={14} surface="light" title="Student" />
          Student
        </span>
      ),
      accessor: (row) => (
        <span className="inline-flex min-w-0 items-center gap-2 font-semibold">
          <MentrixaVocabIcon name="profile" size={16} surface="light" title="Student" />
          <span className="truncate">{row.displayName}</span>
        </span>
      ),
      sortValue: (row) => row.displayName,
      filterValue: (row) => row.displayName,
    },
    {
      id: "sessions",
      header: (
        <span className="inline-flex items-center gap-1.5">
          <MentrixaVocabIcon name={CANONICAL_SESSION_ICON} size={14} surface="light" title="Sessions" />
          Sessions
        </span>
      ),
      accessor: (row) => (
        <span className="font-mono text-xs tabular-nums">{row.sessionCount}</span>
      ),
      sortValue: (row) => row.sessionCount,
      className: "w-24 text-right",
    },
    {
      id: "last",
      header: "Last session",
      accessor: (row) => (
        <span className="text-[11px] text-[#475569]">
          {formatDateInZone(row.lastSessionAt, displayTimeZone)}
        </span>
      ),
      sortValue: (row) => row.lastSessionAt,
      filterValue: (row) => formatDateInZone(row.lastSessionAt, displayTimeZone),
      className: "hidden sm:table-cell",
    },
  ];

  return (
    <DataTable
      rows={students}
      columns={columns}
      getRowKey={(row) => row.studentId}
      filterPlaceholder="Filter roster"
      emptyMessage={GUIDE_HOME.rosterEmpty}
      tone="light"
    />
  );
}
