import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTutorDashboardForAdmin } from "@/app/actions/tutor";
import { TutorDashboardClient, type AnySessionRequest } from "../../tutor-dashboard-client";
import { AdminViewProvider } from "@/components/admin-view-context";
import Link from "next/link";

interface Props {
  params: Promise<{ tutorId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tutorId } = await params;
  const data = await getTutorDashboardForAdmin(tutorId);
  if (!data) return { title: "Tutor not found — Mentrixa" };
  return { title: `Tutor Dashboard (Admin View) — Mentrixa` };
}

export default async function TutorDashboardAdminPage({ params }: Props) {
  const { tutorId } = await params;
  const data = await getTutorDashboardForAdmin(tutorId);

  if (!data) notFound();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 pt-4">
        <Link
          href="/admin?tab=users"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to HR Panel
        </Link>
        <div className="mt-2 mb-1 inline-block px-2.5 py-1 bg-violet-50 text-violet-700 rounded-md text-[11px] font-medium">
          Admin viewing as Tutor
        </div>
      </div>
      <AdminViewProvider userId={tutorId}>
        <TutorDashboardClient
          availability={data.availability}
          upcomingSessions={data.upcomingSessions}
          pastSessions={data.pastSessions}
          sessionRequests={data.sessionRequests as unknown as AnySessionRequest[]}
          autoApprove={data.autoApprove}
          tutorCourses={data.tutorCourses}
        />
      </AdminViewProvider>
    </div>
  );
}
