import { redirect } from "next/navigation";
import { getInstitutionById, getInstitutionMonthlyUsage } from "@/app/actions/institution";
import { BillingClient } from "./billing-client";

export default async function BillingPage({ params }: { params: { institutionId: string } }) {
  const [institution, usage] = await Promise.all([
    getInstitutionById(params.institutionId),
    getInstitutionMonthlyUsage(params.institutionId),
  ]);

  if (!institution) redirect("/");

  return <BillingClient institution={institution} usage={usage} />;
}
