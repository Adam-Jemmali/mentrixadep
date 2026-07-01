"use client";

import Link from "next/link";
import { StudentCourseChips, type StudentCourseChip } from "./student-course-chips";
import {
  defaultShippedSubjectName,
  isSingleShippedSubject,
} from "@/features/quest/shipped-subjects";
import { mentrixProfileType } from "@/features/student-profile/mentrix-student-ui";

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
          <p className={mentrixProfileType.label}>Focus</p>
          <h2 className={`mt-1 ${mentrixProfileType.cardTitle}`}>{subject}</h2>
          <p className={`mt-1 ${mentrixProfileType.bodyItalic}`}>
            Sessions and guides below are scoped to this skill tree.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/student/quest"
            className={mentrixProfileType.ctaSecondary}
          >
            Daily quest
          </Link>
          <Link
            href="/student/mastery"
            className="inline-flex min-h-10 items-center rounded-full border border-slate-200 bg-white px-4 text-xs font-black uppercase italic tracking-[0.14em] text-indigo-900 transition hover:bg-slate-50"
          >
            Skill tree
          </Link>
        </div>
      </div>
    </div>
  );
}

export type { StudentCourseChip };
