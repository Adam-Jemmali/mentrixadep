"use client";

import Link from "next/link";
import { StudentCourseChips, type StudentCourseChip } from "./student-course-chips";
import {
  defaultShippedSubjectName,
  isSingleShippedSubject,
} from "@/features/quest/shipped-subjects";

export function StudentSubjectFocus({
  courses,
  selectedCourse,
  onSelectCourse,
}: {
  courses: StudentCourseChip[];
  selectedCourse: string | "all";
  onSelectCourse: (course: string | "all") => void;
}) {
  if (!isSingleShippedSubject()) {
    return (
      <StudentCourseChips
        courses={courses}
        selectedCourse={selectedCourse}
        onSelectCourse={onSelectCourse}
      />
    );
  }

  const subject = defaultShippedSubjectName();

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_4px_24px_-10px_rgba(15,23,42,0.12)] sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Focus</p>
          <h2 className="mt-1 text-base font-bold text-slate-900">{subject}</h2>
          <p className="mt-1 text-xs text-slate-500">
            Sessions and guides below are scoped to this skill tree.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/student/quest"
            className="inline-flex min-h-10 items-center rounded-full border border-indigo-200 bg-indigo-50 px-4 text-xs font-semibold text-indigo-900 transition hover:bg-indigo-100"
          >
            Daily quest
          </Link>
          <Link
            href="/student/mastery"
            className="inline-flex min-h-10 items-center rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Skill tree
          </Link>
        </div>
      </div>
    </div>
  );
}

export type { StudentCourseChip };
