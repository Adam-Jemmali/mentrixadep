import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStudentProfile } from "@/app/actions/student-profile";
import { getReferralDashboardData } from "@/app/actions/referral";
import { StudentProfileClient } from "./student-profile-client";

interface Props {
  params: Promise<{ studentId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studentId } = await params;
  const data = await getStudentProfile(studentId);
  if (!data) return { title: "Profile - Mentrixa" };
  return {
    title: `${data.displayName} - Mentrixa`,
    description: `Learner profile · ${data.totalXp.toLocaleString()} XP · ${data.levelLabel}`,
  };
}

export default async function StudentPublicProfilePage({ params }: Props) {
  const { studentId } = await params;
  const data = await getStudentProfile(studentId);
  if (!data) notFound();

  const referral =
    data.viewer === "owner" ? await getReferralDashboardData() : null;

  return <StudentProfileClient data={data} referral={referral} />;
}
