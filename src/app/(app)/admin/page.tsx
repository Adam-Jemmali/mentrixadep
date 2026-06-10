import { getPlatformMetrics } from "@/features/admin/admin-dashboard";
import { getRegistrationRequests } from "@/features/admin/registration-queue";
import { getAllUnverifiedTutorCourses } from "@/features/admin/tutor-courses-admin";

import { AdminDashboardClient } from "./admin-dashboard-client";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [metrics, requests, unverifiedCourses] = await Promise.all([
    getPlatformMetrics().catch(() => null),
    getRegistrationRequests().catch(() => []),
    getAllUnverifiedTutorCourses().catch(() => []),
  ]);

  const pendingRequests = (requests ?? []).filter((r) => r.status === "pending");

  return (
    <AdminDashboardClient
      metrics={metrics}
      pendingRequests={pendingRequests}
      unverifiedCourses={unverifiedCourses}
    />
  );
}
