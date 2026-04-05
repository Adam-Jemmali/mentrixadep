"use client";

import { useState } from "react";
import { addTutorCourse, removeTutorCourse } from "@/app/actions/tutor";
import { useAdminViewContext } from "@/components/admin-view-context";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { MENTRIXA_LOGO_PNG } from "@/lib/mentrixa-brand";

interface TutorCourseItem {
  id: string;
  course_name: string;
  proof_description: string;
  verified: boolean;
}

interface CourseManagerProps {
  courses: TutorCourseItem[];
}

export function CourseManager({ courses }: CourseManagerProps) {
  const [courseName, setCourseName] = useState("");
  const [proof, setProof] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { viewingAsUserId } = useAdminViewContext();

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!courseName.trim() || !proof.trim()) {
      setError("Course name and qualifications are required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await addTutorCourse(courseName, proof, viewingAsUserId ?? undefined);
      setCourseName("");
      setProof("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add course");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(courseId: string) {
    try {
      await removeTutorCourse(courseId, viewingAsUserId ?? undefined);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove course");
    }
  }

  return (
    <div>
      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] mb-3">
        My courses
      </div>

      {courses.length === 0 ? (
        <p className="text-xs text-slate-400 mb-3">
          No courses added yet. Add courses you can teach below.
        </p>
      ) : (
        <div className="mb-4 space-y-0 divide-y divide-slate-100">
          {courses.map((c) => (
            <div key={c.id} className="flex items-start justify-between py-2.5 gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900 truncate">{c.course_name}</span>
                
                </div>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{c.proof_description}</p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(c.id)}
                className="text-xs text-slate-300 hover:text-red-500 shrink-0 mt-0.5"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleAdd} className="border-t border-slate-200 pt-3 space-y-2">
        <Input
          value={courseName}
          onChange={(e) => setCourseName(e.target.value)}
          placeholder="Course name (e.g. Calculus II)"
          className="h-8 text-xs"
          maxLength={100}
        />
        <textarea
          value={proof}
          onChange={(e) => setProof(e.target.value)}
          placeholder="Your qualifications (e.g. Completed with A+, TA for 2 semesters)"
          className="w-full h-16 text-xs rounded-md border border-slate-200 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-mentrixa-600/20 focus:border-mentrixa-300"
          maxLength={500}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <Button type="submit" size="sm" className="w-full" disabled={loading}>
          {loading ? (
            "Adding..."
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Image src={MENTRIXA_LOGO_PNG} alt="" width={12} height={12} className="h-3 w-3" />
              Add course
            </span>
          )}
        </Button>
      </form>
    </div>
  );
}
