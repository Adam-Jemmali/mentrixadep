import { redirect } from "next/navigation";
import { getInstitutionById, getInstitutionMembers } from "@/features/institutions/institution";
import { InstitutionMembersClient } from "./members-client";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ institutionId: string }>;
}) {
  const { institutionId } = await params;
  const [institution, members] = await Promise.all([
    getInstitutionById(institutionId),
    getInstitutionMembers(institutionId),
  ]);

  if (!institution) redirect("/");

  return (
    <InstitutionMembersClient
      institutionId={institutionId}
      plan={institution.plan}
      members={members}
    />
  );
}
