import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStudentProfile } from "@/features/student-profile/student-profile";
import { getReferralDashboardData } from "@/features/referrals/referrals";
import { getStudentSubscription } from "@/features/payments/student-subscription";
import { getStudentEntitlements } from "@/features/entitlements/entitlements";
import { loadOwnerCertification } from "@/features/certifications/load-certification";
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
  const subscription =
    data.viewer === "owner" ? await getStudentSubscription(data.studentId) : null;
  const entitlements =
    data.viewer === "owner" ? await getStudentEntitlements(data.studentId) : null;
  const certification =
    data.viewer === "owner" ? await loadOwnerCertification(data.studentId) : null;

  return (
    <StudentProfileClient
      data={data}
      referral={referral}
      subscription={subscription}
      entitlements={entitlements}
      certification={certification}
    />
  );
}
