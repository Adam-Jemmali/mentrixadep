"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addStudentCourse, removeStudentCourse } from "@/app/actions/student";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  const [courseName, setCourseName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!courseName.trim()) {
      setError("Enter a course name");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await addStudentCourse(courseName);
      setCourseName("");
      onSelectCourse("all");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add course");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(courseId: string) {
    try {
      await removeStudentCourse(courseId);
      onSelectCourse("all");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove course");
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_4px_24px_-10px_rgba(15,23,42,0.12)] sm:p-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Focus</p>
        <h2 className="mt-1 text-base font-bold text-slate-900">My courses</h2>
        <p className="mt-1 text-xs text-slate-500">
          Tap a subject to filter sessions and Guides below.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSelectCourse("all")}
          className={cn(
            "min-h-11 w-full rounded-full px-3.5 py-2 text-xs font-semibold transition-colors border-2 sm:w-auto",
            selectedCourse === "all"
              ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200",
          )}
        >
          All
        </button>
        {courses.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelectCourse(c.course_name)}
            className={cn(
              "inline-flex min-h-11 w-full items-center justify-between gap-2 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors border-2 sm:w-auto sm:justify-start",
              selectedCourse === c.course_name
                ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "border-slate-200 bg-white text-slate-700 hover:border-blue-200",
            )}
          >
            {c.course_name}
            <span
              role="button"
              tabIndex={0}
              className="ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-300 hover:bg-slate-100 hover:text-red-500"
              onClick={(e) => {
                e.stopPropagation();
                void handleRemove(c.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  void handleRemove(c.id);
                }
              }}
            >
              ×
            </span>
          </button>
        ))}
      </div>

      <form onSubmit={handleAdd} className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Input
          value={courseName}
          onChange={(e) => setCourseName(e.target.value)}
          placeholder="Add a course (e.g. PROB STATS)"
          className="h-11 w-full rounded-xl border-slate-200 bg-slate-50/80 text-sm sm:max-w-xs"
        />
        <Button
          type="submit"
          size="sm"
          disabled={loading}
          className="h-11 rounded-full bg-blue-600 px-5 font-semibold text-white hover:bg-blue-500 sm:w-auto"
        >
          {loading ? "Adding…" : "Add"}
        </Button>
      </form>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
