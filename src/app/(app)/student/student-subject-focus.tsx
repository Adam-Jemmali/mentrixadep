"use client";

import Link from "next/link";
import { StudentCourseChips, type StudentCourseChip } from "./student-course-chips";
import {
  defaultShippedSubjectName,
  isSingleShippedSubject,
} from "@/features/quest/shipped-subjects";
import { mentrixStudent, mentrixProfileType } from "@/features/student-profile/mentrix-student-ui";

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
    <div className={`${mentrixStudent.card} p-4 sm:p-5`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className={mentrixProfileType.labelOnDark}>Focus</p>
          <h2 className={`mt-1 ${mentrixProfileType.cardTitleOnDark}`}>{subject}</h2>
          <p className={`mt-1 ${mentrixProfileType.bodyItalicOnDark}`}>
            Sessions and guides below are scoped to this skill tree.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/student/quest" className={mentrixProfileType.ctaPrimary}>
            Daily quest
          </Link>
          <Link href="/student/mastery" className={mentrixProfileType.ctaSecondaryOnDark}>
            Skill tree
          </Link>
        </div>
      </div>
    </div>
  );
}

export type { StudentCourseChip };
