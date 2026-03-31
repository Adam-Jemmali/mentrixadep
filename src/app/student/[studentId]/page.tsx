import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getStudentDashboardForAdmin } from "@/app/actions/student";
import { SessionsList } from "../sessions-list";
import { AvailabilityBrowser } from "../availability-browser";
import { StudentDashboardIllustration } from "@/components/illustrations";
import { AdminViewProvider } from "@/components/admin-view-context";

interface Props {
  params: Promise<{ studentId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studentId } = await params;
  const data = await getStudentDashboardForAdmin(studentId);
  if (!data) return { title: "Student not found — Mentrixa" };
  return { title: `Student Dashboard (Admin View) — Mentrixa` };
}

export default async function StudentDashboardAdminPage({ params }: Props) {
  const { studentId } = await params;
  const data = await getStudentDashboardForAdmin(studentId);

  if (!data) notFound();

  const firstName = data.email.split("@")[0] || "Student";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Admin context bar */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/admin?tab=users"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to HR Panel
          </Link>
          <span className="inline-block px-2.5 py-1 bg-violet-50 text-violet-700 rounded-md text-[11px] font-medium">
            Admin viewing as Student
          </span>
        </div>

        {/* Same header as student dashboard */}
        <div className="relative flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[22px] font-bold tracking-[-0.03em]">
              Dashboard for {firstName}
            </h1>
            {data.streak > 2 && (
              <p className="text-sm text-slate-400 mt-1">
                {data.streak}-day streak.
              </p>
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
