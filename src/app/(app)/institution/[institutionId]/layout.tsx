import { redirect } from "next/navigation";
import { getInstitutionById } from "@/features/institutions/institution";
import { InstitutionSidebar } from "./institution-sidebar";

export default async function InstitutionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ institutionId: string }>;
}) {
  const { institutionId } = await params;
  const institution = await getInstitutionById(institutionId);

  if (!institution) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-slate-100 flex text-slate-900">
      <InstitutionSidebar institution={institution} />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-6 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
