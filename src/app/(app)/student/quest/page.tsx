import { getStudentCourses } from "@/features/booking/student-courses";
import { getDivisionsCatalog } from "@/features/divisions/leaderboard";
import { QuestPageClient } from "./quest-page-client";

export const metadata = { title: "Quest · Mentrixa" };

/** Server actions that call Gemini for practice packs need time (see PRACTICE_PACK_TIMEOUT_MS + retry). */
export const maxDuration = 300;

function normalizeSubjectLabel(value: string): string {
  return value.replace(/\s+Division$/i, "").trim().toLowerCase();
}

function buildSubjectOptions(
  divisions: { key: string; name: string }[],
  courseNames: string[],
): { key: string; name: string }[] {
  if (courseNames.length === 0) {
    return divisions.map((d) => ({ key: d.key, name: d.name }));
  }

  const normalizedCourses = new Set(courseNames.map((name) => normalizeSubjectLabel(name)));
  const matched = divisions.filter((d) => {
    const base = normalizeSubjectLabel(d.name);
    return (
      normalizedCourses.has(base) ||
      normalizedCourses.has(d.key.toLowerCase()) ||
      [...normalizedCourses].some((course) => course === base || course.includes(base))
    );
  });

  if (matched.length === 0) {
    return divisions.map((d) => ({ key: d.key, name: d.name }));
  }

  return matched.map((d) => ({ key: d.key, name: d.name }));
}

export default async function QuestPage() {
  const divisions = await getDivisionsCatalog();
  const studentCourses = await getStudentCourses().catch(() => []);
  const courseNames = studentCourses.map((row) => row.course_name);
  const subjectOptions = buildSubjectOptions(divisions, courseNames);

  return <QuestPageClient subjectOptions={subjectOptions} />;
}
