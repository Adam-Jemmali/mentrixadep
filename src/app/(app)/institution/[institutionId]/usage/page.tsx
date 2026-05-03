import { redirect } from "next/navigation";
import { getInstitutionById, getInstitutionUsageReport } from "@/app/actions/institution";
import { InstitutionUsageClient } from "./usage-client";

export default async function UsagePage({
  params,
}: {
  params: Promise<{ institutionId: string }>;
}) {
  const { institutionId } = await params;
  const [institution, report] = await Promise.all([
    getInstitutionById(institutionId),
    getInstitutionUsageReport(institutionId),
  ]);

  if (!institution) redirect("/");

  return <InstitutionUsageClient institutionId={institutionId} name={institution.name} report={report} />;
}
