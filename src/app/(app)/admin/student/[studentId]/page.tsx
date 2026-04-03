import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getStudentDashboardForAdmin } from "@/app/actions/student";
import { SessionsList } from "@/app/(app)/student/sessions-list";
import { AvailabilityBrowser } from "@/app/(app)/student/availability-browser";
import { StudentDashboardIllustration } from "@/components/illustrations";
import { AdminViewProvider } from "@/components/admin-view-context";

interface Props {
  params: Promise<{ studentId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studentId } = await params;
  const data = await getStudentDashboardForAdmin(studentId);
  if (!data) return { title: "Student not found — Mentrixa" };
  return { title: `Student dashboard (admin) — Mentrixa` };
}

export default async function AdminStudentDashboardPage({ params }: Props) {
  const { studentId } = await params;
  const data = await getStudentDashboardForAdmin(studentId);

  if (!data) notFound();

  const firstName = data.email.split("@")[0] || "Student";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/admin?tab=users"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-700"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M10 12L6 8l4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back to HR panel
          </Link>
          <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700">
            Admin viewing as student
          </span>
        </div>

        <div className="relative mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-medium tracking-tight text-slate-900">
              Dashboard for {firstName}
            </h1>
            {data.streak > 2 && (
              <p className="mt-1 text-sm text-slate-500">{data.streak}-day streak.</p>
            )}
          </div>
          <StudentDashboardIllustration />
        </div>

        <AdminViewProvider userId={studentId}>
          <SessionsList
            upcomingSessions={data.upcomingSessions}
            pastSessions={data.pastSessions}
            totalXp={data.totalXp}
            streak={data.streak}
          >
            <AvailabilityBrowser availability={data.availability} courses={data.courses} />
          </SessionsList>
        </AdminViewProvider>
      </main>
    </div>
  );
}
