import { getPlatformMetrics } from "@/features/admin/admin-dashboard";

import { AdminDashboardClient } from "./admin-dashboard-client";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const metrics = await getPlatformMetrics().catch(() => null);

  return <AdminDashboardClient metrics={metrics} />;
}
