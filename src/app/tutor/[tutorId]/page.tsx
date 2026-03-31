import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTutorPublicProfile } from "@/app/actions/tutor";
import { getCurrentUser } from "@/lib/auth";
import { TutorProfileClient } from "./tutor-profile-client";

interface Props {
  params: Promise<{ tutorId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tutorId } = await params;
  const profile = await getTutorPublicProfile(tutorId);
  if (!profile) return { title: "Tutor not found — Mentrixa" };
  const title = `${profile.name} - Mentrixa Guide`;
  const description = `Book a session with ${profile.name} on Mentrixa.`;
  return {
    title,
    description,
    openGraph: { title, description },
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
    />
  );
}
