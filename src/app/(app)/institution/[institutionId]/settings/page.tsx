import { redirect } from "next/navigation";
import { getInstitutionById } from "@/app/actions/institution";
import { InstitutionSettingsClient } from "./settings-client";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ institutionId: string }>;
}) {
  const { institutionId } = await params;
  const institution = await getInstitutionById(institutionId);
  if (!institution) redirect("/");

  return <InstitutionSettingsClient institution={institution} />;
}
