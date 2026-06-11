import { getSystemSettings } from "@/features/admin/system-settings";

import { AdminSettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings · Admin · Mentrixa" };

export default async function AdminSettingsPage() {
  const settings = await getSystemSettings().catch(() => ({
    autoApproveRegistrations: false,
    maxQuestsPerDay: 10,
    platformFeePercent: 15,
    maintenanceMode: false,
    duelsEnabled: true,
    aiQuestsEnabled: true,
  }));

  return <AdminSettingsClient settings={settings} />;
}
