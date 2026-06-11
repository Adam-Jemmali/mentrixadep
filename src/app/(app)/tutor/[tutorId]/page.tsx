import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTutorPublicProfile } from "@/features/tutor/public-profile";
import { getCurrentUser } from "@/shared/core/auth";
import { getSiteUrl } from "@/shared/core/site";
import { TutorProfileClient } from "./tutor-profile-client";

interface Props {
  params: Promise<{ tutorId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tutorId } = await params;
  const profile = await getTutorPublicProfile(tutorId);
  if (!profile) return { title: "Tutor not found, Mentrixa" };
  const title = profile.guideRank && profile.guideRank !== "practitioner"
    ? `${profile.name} — ${profile.guideRank.toUpperCase()} Guide · Mentrixa`
    : `${profile.name} - Mentrixa Guide`;
  const description = `Book a session with ${profile.name} on Mentrixa.`;
  const canonical = `${getSiteUrl()}/tutor/${tutorId}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function TutorProfilePage({ params }: Props) {
  const { tutorId } = await params;
  const [profile, currentUser] = await Promise.all([
    getTutorPublicProfile(tutorId),
    getCurrentUser(),
  ]);

  if (!profile) notFound();

  return (
    <TutorProfileClient
      profile={profile}
      isAuthenticated={!!currentUser}
      isOwnProfile={currentUser?.id === tutorId}
      viewerRole={currentUser?.role ?? null}
    />
  );
}
