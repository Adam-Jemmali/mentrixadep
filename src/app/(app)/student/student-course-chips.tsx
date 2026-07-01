"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addStudentCourse, removeStudentCourse } from "@/features/booking/student-courses";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/core/utils";
import { SHIPPED_SUBJECT_CATALOG } from "@/features/quest/shipped-subjects";
import { mentrixProfileType } from "@/features/student-profile/mentrix-student-ui";

export type StudentCourseChip = { id: string; course_name: string };

export function StudentCourseChips({
  courses,
  selectedCourse,
  onSelectCourse,
}: {
  courses: StudentCourseChip[];
  selectedCourse: string | "all";
  onSelectCourse: (course: string | "all") => void;
}) {
  const [loading, setLoading] = useState(false);
  const [localCourses, setLocalCourses] = useState(courses);
  const [isRefreshing, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const enrolledNames = new Set(localCourses.map((c) => c.course_name.trim().toLowerCase()));
  const enrollableSubjects = SHIPPED_SUBJECT_CATALOG.filter(
    (subject) => !enrolledNames.has(subject.name.trim().toLowerCase()),
  );

  useEffect(() => {
    setLocalCourses(courses);
  }, [courses]);

  async function handleAdd(subjectName: string) {
    if (!subjectName.trim()) return;
    setLoading(true);
    setError(null);
    const nextCourseName = subjectName.trim();
    const optimisticCourse: StudentCourseChip = {
      id: `temp-${Date.now()}`,
      course_name: nextCourseName,
    };
    setLocalCourses((current) => [...current, optimisticCourse]);
    try {
      await addStudentCourse(nextCourseName);
      onSelectCourse(nextCourseName);
      startTransition(() => router.refresh());
    } catch (err) {
      setLocalCourses((current) => current.filter((c) => c.id !== optimisticCourse.id));
      setError(err instanceof Error ? err.message : "Failed to add course");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(courseId: string) {
    if (courseId.startsWith("temp-")) return;
    const prev = localCourses;
    setLocalCourses((current) => current.filter((c) => c.id !== courseId));
    try {
      await removeStudentCourse(courseId);
      onSelectCourse("all");
      startTransition(() => router.refresh());
    } catch (err) {
      setLocalCourses(prev);
      setError(err instanceof Error ? err.message : "Failed to remove course");
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_4px_24px_-10px_rgba(15,23,42,0.12)] sm:p-5">
      <div>
        <p className={mentrixProfileType.label}>Focus</p>
        <h2 className={`mt-1 ${mentrixProfileType.cardTitle}`}>My courses</h2>
        <p className={`mt-1 ${mentrixProfileType.bodyItalic}`}>
          Tap a subject to filter sessions and guides below.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSelectCourse("all")}
          aria-label="All courses"
          aria-pressed={selectedCourse === "all"}
          className={cn(
            "min-h-11 w-full rounded-full px-3.5 py-2 text-xs font-semibold transition-colors border-2 sm:w-auto",
            selectedCourse === "all"
              ? "border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
              : "border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-200",
          )}
        >
          All
        </button>
        {localCourses.map((c) => (
          <div
            key={c.id}
            className={cn(
              "inline-flex min-h-11 w-full items-stretch overflow-hidden rounded-full border-2 sm:w-auto",
              selectedCourse === c.course_name
                ? "border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                : "border-slate-200 bg-white text-slate-700",
            )}
          >
            <button
              type="button"
              onClick={() => onSelectCourse(c.course_name)}
              aria-pressed={selectedCourse === c.course_name}
              className={cn(
                "min-h-11 flex-1 px-3.5 py-2 text-left text-xs font-semibold transition-colors sm:text-center",
                selectedCourse === c.course_name
                  ? "text-white hover:bg-indigo-500/90"
                  : "hover:bg-slate-50",
              )}
            >
              {c.course_name}
            </button>
            <button
              type="button"
              aria-label={`Remove ${c.course_name} from my courses`}
              className={cn(
                "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center border-l text-base leading-none transition-colors",
                selectedCourse === c.course_name
                  ? "border-indigo-400/50 text-white/80 hover:bg-indigo-500/90 hover:text-white"
                  : "border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-600",
              )}
              onClick={() => void handleRemove(c.id)}
            >
              <span aria-hidden>×</span>
            </button>
          </div>
        ))}
      </div>

      {enrollableSubjects.length > 0 ? (
        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Add a skill tree
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {enrollableSubjects.map((subject) => (
              <Button
                key={subject.key}
                type="button"
                size="sm"
                disabled={loading}
                onClick={() => void handleAdd(subject.name)}
                className="h-10 rounded-full bg-indigo-600 px-4 font-semibold text-white hover:bg-indigo-500"
              >
                {subject.name}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
      {isRefreshing ? <p className="mt-2 text-xs text-slate-500">Syncing courses…</p> : null}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
