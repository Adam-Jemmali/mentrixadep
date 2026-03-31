"use client";

import { useState } from "react";
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
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove course");
    }
  }

  return (
    <div className="border border-slate-200 rounded-lg bg-white p-4 mb-6">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">My courses</h3>
      <p className="text-xs text-slate-600 mb-3 leading-relaxed">
        Add the courses you need help with. We&apos;ll show you matching tutors first.
      </p>

      {courses.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {courses.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700"
            >
              {c.course_name}
              <button
                type="button"
                onClick={() => handleRemove(c.id)}
                className="text-slate-300 hover:text-red-500 transition-colors"
              >
                &times;
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
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
