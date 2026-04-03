import { redirect } from "next/navigation";
import { getInstitutionById, getInstitutionMembers } from "@/app/actions/institution";
import { InstitutionMembersClient } from "./members-client";

export default async function MembersPage({ params }: { params: { institutionId: string } }) {
  const [institution, members] = await Promise.all([
    getInstitutionById(params.institutionId),
    getInstitutionMembers(params.institutionId),
  ]);

  if (!institution) redirect("/");

  return (
    <InstitutionMembersClient
      institutionId={params.institutionId}
      plan={institution.plan}
      members={members}
    />
  );
}
