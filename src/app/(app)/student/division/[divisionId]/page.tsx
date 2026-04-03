import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { loadDivisionDetailPage } from "@/app/actions/divisions";
import { DivisionDetailClient } from "./division-detail-client";

export default async function DivisionDetailPage({
  params,
}: {
  params: Promise<{ divisionId: string }>;
}) {
  const { divisionId } = await params;
  const key = decodeURIComponent(divisionId);
  const user = await requireRole(["student", "admin"]);
  const data = await loadDivisionDetailPage(key, user.id);
  if (!data) notFound();

  return <DivisionDetailClient divisionKey={key} initial={data} />;
}
