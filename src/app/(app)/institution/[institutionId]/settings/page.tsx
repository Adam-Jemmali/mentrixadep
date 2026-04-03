import { redirect } from "next/navigation";
import { getInstitutionById } from "@/app/actions/institution";
import { InstitutionSettingsClient } from "./settings-client";

export default async function SettingsPage({ params }: { params: { institutionId: string } }) {
  const institution = await getInstitutionById(params.institutionId);
  if (!institution) redirect("/");

  return <InstitutionSettingsClient institution={institution} />;
}
