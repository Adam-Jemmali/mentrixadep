"use client";

import { useEffect, useState, useTransition } from "react";
import { addStudentCourse, removeStudentCourse } from "@/app/actions/student";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface StudentCourseItem {
  id: string;
  course_name: string;
}

interface CourseInterestsProps {
  courses: StudentCourseItem[];
}

export function CourseInterests({ courses }: CourseInterestsProps) {
  const [courseName, setCourseName] = useState("");
  const [loading, setLoading] = useState(false);
  const [localCourses, setLocalCourses] = useState(courses);
  const [isRefreshing, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setLocalCourses(courses);
  }, [courses]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!courseName.trim()) {
      setError("Enter a course name");
      return;
    }
    setLoading(true);
    setError(null);
    const nextCourseName = courseName.trim();
    const optimisticCourse: StudentCourseItem = {
      id: `temp-${Date.now()}`,
      course_name: nextCourseName,
    };
    setLocalCourses((current) => [...current, optimisticCourse]);
    try {
      await addStudentCourse(nextCourseName);
      setCourseName("");
      startTransition(() => router.refresh());
    } catch (err) {
      setLocalCourses((current) => current.filter((c) => c.id !== optimisticCourse.id));
      setError(err instanceof Error ? err.message : "Failed to add course");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(courseId: string) {
    const previousCourses = localCourses;
    setLocalCourses((current) => current.filter((c) => c.id !== courseId));
    try {
      await removeStudentCourse(courseId);
      startTransition(() => router.refresh());
    } catch (err) {
      setLocalCourses(previousCourses);
      setError(err instanceof Error ? err.message : "Failed to remove course");
    }
  }

  return (
    <div className="border border-slate-200 rounded-lg bg-white p-4 mb-6">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">My courses</h3>
      <p className="text-xs text-slate-600 mb-3 leading-relaxed">
        Add the courses you need help with. We&apos;ll show you matching tutors first.
      </p>

      {localCourses.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {localCourses.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700"
            >
              {c.course_name}
              <button
                type="button"
                onClick={() => handleRemove(c.id)}
                aria-label={`Remove ${c.course_name} from my courses`}
                className="inline-flex min-h-11 min-w-11 -my-1 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <span aria-hidden>×</span>
              </button>
            </span>
          ))}
        </div>
      )}

      <form onSubmit={handleAdd} className="flex gap-2">
        <Input
          value={courseName}
          onChange={(e) => setCourseName(e.target.value)}
          placeholder="e.g. Calculus II, Data Structures"
          className="h-8 text-xs flex-1"
          maxLength={100}
        />
        <Button type="submit" size="sm" disabled={loading} className="shrink-0">
          {loading ? "Adding..." : "Add"}
        </Button>
      </form>
      {isRefreshing ? <p className="text-xs text-slate-500 mt-2">Syncing courses…</p> : null}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
