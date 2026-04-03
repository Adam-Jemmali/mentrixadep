import { redirect } from "next/navigation";
import { getInstitutionById, getInstitutionMonthlyUsage, getInstitutionMembers } from "@/app/actions/institution";
import { InstitutionOverviewClient } from "./overview-client";

export default async function InstitutionOverviewPage({
  params,
}: {
  params: { institutionId: string };
}) {
  const [institution, usage, members] = await Promise.all([
    getInstitutionById(params.institutionId),
    getInstitutionMonthlyUsage(params.institutionId),
    getInstitutionMembers(params.institutionId),
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
