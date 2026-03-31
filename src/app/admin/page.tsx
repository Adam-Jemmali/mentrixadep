import { requireRole } from "@/lib/auth";
import { getRegistrationRequests, getAllUsers, getAutoApproveRegistrations, getAllUnverifiedTutorCourses } from "@/app/actions/admin";
import { AdminClient } from "./admin-client";

export const metadata = { title: "Admin · Mentrixa" };

type Props = { searchParams: Promise<{ tab?: string }> };

export default async function AdminPage({ searchParams }: Props) {
  await requireRole("admin");

  const params = await searchParams;
  const validTabs = ["pending", "users", "courses"];
  const tab = validTabs.includes(params.tab ?? "") ? (params.tab as "pending" | "users" | "courses") : "pending";

  const [requests, users, autoApproveRegistrations, unverifiedCourses] = await Promise.all([
    getRegistrationRequests(),
    getAllUsers(),
    getAutoApproveRegistrations().catch(() => false),
    getAllUnverifiedTutorCourses().catch(() => []),
  ]);

  const pendingRequests = (requests ?? []).filter((r) => r.status === "pending");

  return (
    <AdminClient
      pendingRequests={pendingRequests}
      allRequests={requests ?? []}
      users={users}
      defaultTab={tab}
      autoApproveRegistrations={autoApproveRegistrations}
      unverifiedCourses={unverifiedCourses}
    />
  );
}
