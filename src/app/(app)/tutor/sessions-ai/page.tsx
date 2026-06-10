import { requireRole } from "@/shared/core/auth";
import { getTutorSessionsWithPackages } from "@/features/studio-ai/studio-packages";
import type { SessionAiPackage } from "@/shared/types/database";
import { TutorStudioPageClient } from "./tutor-studio-page-client";

export const metadata = { title: "Studio · Mentrixa" };

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
  const generatedCount = sessions.filter((session) => session.aiPackage?.package_published_at).length;

  return (
    <TutorStudioPageClient
      sessions={sessions}
      fetchError={fetchError}
      tutorId={tutorId}
      viewerUserId={user.id}
      viewerRole={user.role === "admin" ? "admin" : "tutor"}
      generatedCount={generatedCount}
      studioKey={studioSessionsKey(sessions)}
    />
  );
}
