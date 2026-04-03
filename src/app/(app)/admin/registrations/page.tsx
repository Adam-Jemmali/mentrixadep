import { getRegistrationRequests, getAutoApproveRegistrations } from "@/app/actions/admin";
import { AdminRegistrationsClient } from "./registrations-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Registrations · Admin · Mentrixa" };

export default async function AdminRegistrationsPage() {
  const [requests, autoApprove] = await Promise.all([
    getRegistrationRequests().catch(() => []),
    getAutoApproveRegistrations().catch(() => false),
  ]);

  return <AdminRegistrationsClient requests={requests ?? []} autoApprove={autoApprove} />;
}
