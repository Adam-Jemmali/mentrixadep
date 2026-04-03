import { redirect } from "next/navigation";
import { getInstitutionById, getInstitutionUsageReport } from "@/app/actions/institution";
import { InstitutionUsageClient } from "./usage-client";

export default async function UsagePage({ params }: { params: { institutionId: string } }) {
  const [institution, report] = await Promise.all([
    getInstitutionById(params.institutionId),
    getInstitutionUsageReport(params.institutionId),
  ]);

  if (!institution) redirect("/");

  return <InstitutionUsageClient institutionId={params.institutionId} name={institution.name} report={report} />;
}
