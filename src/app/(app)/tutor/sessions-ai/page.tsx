import { requireRole } from "@/lib/auth";
import { getLocalHour, greetingForHour, firstNameFromDisplayName } from "@/lib/student-dashboard-helpers";
import { getTutorSessionsWithPackages } from "@/app/actions/autoPilot";
import type { SessionAiPackage } from "@/lib/database.types";
import { TutorStudioClient } from "./tutor-studio-client";
import { AdminViewProvider } from "@/components/admin-view-context";
import Link from "next/link";
import { mentrixTutor } from "@/lib/mentrix-tutor-ui";
import { TutorHeroGreeting } from "@/components/tutor/tutor-hero-greeting";
import { Typewriter } from "@/components/ui/typewriter";

import { StudioGuideBounce } from "@/components/tutor/studio-guide-bounce";

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
  const now = new Date();
  const params = searchParams ? await searchParams : {};
  const tutorId = user.role === "admin" ? params.tutorId : undefined;
  
  const result = await getTutorSessionsWithPackages(tutorId);
  const sessions = "error" in result ? [] : result;
  
  const timeZone = "UTC"; // Default or from data
  const firstName = firstNameFromDisplayName(user.displayName, user.email || "");
  const hour = getLocalHour(now, timeZone);
  const greeting = greetingForHour(hour, firstName);
  const fetchError = "error" in result ? result.error : null;
  const generatedCount = sessions.filter((session) => session.aiPackage?.package_published_at)
    .length;

  return (
    <div className={mentrixTutor.pageBg}>
    <div className="max-w-7xl mx-auto px-6 py-8 relative">
      <header className={`${mentrixTutor.heroGradient} mb-10 p-6 sm:p-8 relative overflow-hidden`}>
        <StudioGuideBounce />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl space-y-3">
            <TutorHeroGreeting greeting={greeting} firstName={firstName} />
            <div className="mt-1 text-sm text-white/90 h-[20px]">
              <Typewriter text="Mentrixa Quest packages for every session you teach." speed={40} waitTime={5000} />
            </div>
            
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-50 shadow-sm backdrop-blur-sm">
                Studio
              </span>
              <span className="text-xs font-mono tabular-nums text-white/85">
                {generatedCount} packages generated
              </span>
            </div>
          </div>

          {tutorId && (
            <div className="flex flex-col items-start gap-3 lg:items-end shrink-0">
              <Link
                href={`/tutor/${tutorId}/dashboard`}
                className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back to Dashboard
              </Link>
              <span className="inline-block px-2.5 py-1 bg-white/10 text-white rounded-md text-[11px] font-medium backdrop-blur-sm">
                Admin viewing as Tutor
              </span>
            </div>
          )}
        </div>
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
    </div>
  );
}
