import { redirect } from "next/navigation";
import { getInstitutionById, getInstitutionMonthlyUsage } from "@/features/institutions/institution";
import { BillingClient } from "./billing-client";

export default async function BillingPage({
  params,
}: {
  params: Promise<{ institutionId: string }>;
}) {
  const { institutionId } = await params;
  const [institution, usage] = await Promise.all([
    getInstitutionById(institutionId),
    getInstitutionMonthlyUsage(institutionId),
  ]);

  if (!institution) redirect("/");

  return <BillingClient institution={institution} usage={usage} />;
}
