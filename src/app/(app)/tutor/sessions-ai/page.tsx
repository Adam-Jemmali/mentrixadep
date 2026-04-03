import { requireRole } from "@/lib/auth";
import { getTutorSessionsWithPackages } from "@/app/actions/autoPilot";
import type { SessionAiPackage } from "@/lib/database.types";
import { TutorStudioClient } from "./tutor-studio-client";
import { TutorStudioIllustration } from "@/components/illustrations";
import { AdminViewProvider } from "@/components/admin-view-context";
import Link from "next/link";

export const metadata = { title: "Tutor Studio · Mentrixa" };

/** Remount Studio when server data changes so client table matches header counts. */
function studioSessionsKey(
  sessions: { id: string; aiPackage: SessionAiPackage | null }[],
): string {
  return sessions
    .map((s) => {
      const p = s.aiPackage;
      if (!p) return `${s.id}:0`;
      return `${s.id}:${p.package_published_at ? "pub" : "draft"}`;
    })
    .join("|");
}

interface StudioPageProps {
  searchParams?: Promise<{ tutorId?: string }>;
}

export default async function TutorStudioPage({ searchParams }: StudioPageProps) {
  const user = await requireRole(["tutor", "admin"]);
  const params = searchParams ? await searchParams : {};
  const tutorId = user.role === "admin" ? params.tutorId : undefined;
  const result = await getTutorSessionsWithPackages(tutorId);
  const sessions = "error" in result ? [] : result;
  const fetchError = "error" in result ? result.error : null;
  const generatedCount = sessions.filter((session) => session.aiPackage?.package_published_at)
    .length;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 relative">
      <TutorStudioIllustration />
      {tutorId && (
        <div className="flex items-center justify-between mb-4">
          <Link
            href={`/tutor/${tutorId}/dashboard`}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to Tutor Dashboard
          </Link>
          <span className="inline-block px-2.5 py-1 bg-violet-50 text-violet-700 rounded-md text-[11px] font-medium">
            Admin viewing as Tutor
          </span>
        </div>
      )}
      <header className="flex items-center justify-between mb-6 border-b border-[#E2E8F0] pb-6">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.03em] text-slate-900">Studio</h1>
          <p className="text-sm text-slate-400 mt-1">
            Mentrixa AI packages for every session you teach.
          </p>
        </div>
        <p className="text-sm text-slate-400">{generatedCount} packages generated</p>
      </header>

      <div>
        {fetchError ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {fetchError}
          </div>
        ) : tutorId ? (
          <AdminViewProvider userId={tutorId}>
            <TutorStudioClient
              key={studioSessionsKey(sessions)}
              sessions={sessions}
            />
          </AdminViewProvider>
        ) : (
          <TutorStudioClient
            key={studioSessionsKey(sessions)}
            sessions={sessions}
          />
        )}
      </div>
    </div>
  );
}
