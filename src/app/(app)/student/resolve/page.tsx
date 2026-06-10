import { getStudentCourses } from "@/features/booking/student-courses";
import { ResolvePageClient } from "./ResolvePageClient";

export default async function ResolvePage() {
  const courses = await getStudentCourses();
  const subjects = Array.from(
    new Set(
      (courses ?? [])
        .map((c) => (typeof c.course_name === "string" ? c.course_name.trim() : ""))
        .filter(Boolean),
    ),
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 mb-2">
          Resolve
        </h1>
        <p className="text-slate-600 mb-8 text-sm">
          Share the exact problem. Resolve gives you a guided approach, not just an answer.
        </p>
        <ResolvePageClient subjects={subjects} />
      </main>
    </div>
  );
}
