import { redirect } from "next/navigation";
import { getInstitutionById, getInstitutionMonthlyUsage, getInstitutionMembers } from "@/features/institutions/institution";
import { InstitutionOverviewClient } from "./overview-client";

export default async function InstitutionOverviewPage({
  params,
}: {
  params: Promise<{ institutionId: string }>;
}) {
  const { institutionId } = await params;
  const [institution, usage, members] = await Promise.all([
    getInstitutionById(institutionId),
    getInstitutionMonthlyUsage(institutionId),
    getInstitutionMembers(institutionId),
  ]);

  if (!institution) redirect("/");

  return (
    <InstitutionOverviewClient
      institution={institution}
      usage={usage}
      memberCount={members.length}
      recentMembers={members.slice(0, 5)}
    />
  );
}
