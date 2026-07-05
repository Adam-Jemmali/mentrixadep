"use client";

import Link from "next/link";
import { StudentCourseChips, type StudentCourseChip } from "./student-course-chips";
import {
  defaultShippedSubjectName,
  isSingleShippedSubject,
} from "@/features/quest/shipped-subjects";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import {
  CANONICAL_QUEST_ICON,
  CANONICAL_SKILLS_ICON,
} from "@/shared/icons/vocab-canonical";

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
          <p className={mentrixStudent.sectionEyebrow}>Focus</p>
          <h2 className={`mt-1 ${mentrixStudent.cardTitle}`}>{subject}</h2>
          <p className={`mt-1 ${mentrixStudent.pageSubtitle}`}>
            Sessions and guides below are scoped to this skill tree.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/student/quest" className={`inline-flex items-center gap-2 ${mentrixStudent.hubBtnSolid}`}>
            <MentrixaVocabIcon name={CANONICAL_QUEST_ICON} size={16} surface="light" title="Quest" />
            Daily quest
          </Link>
          <Link href="/student/mastery" className={`inline-flex items-center gap-2 ${mentrixStudent.hubGhostLink}`}>
            <MentrixaVocabIcon name={CANONICAL_SKILLS_ICON} size={16} surface="light" title="Skills" />
            Skill tree
          </Link>
        </div>
      </div>
    </div>
  );
}

export type { StudentCourseChip };
