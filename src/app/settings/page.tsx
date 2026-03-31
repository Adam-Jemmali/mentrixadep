import { requireAuth } from "@/lib/auth";
import { getUserSettings } from "@/app/actions/settings";
import { SettingsClient } from "./settings-client";

export const metadata = {
  title: "Settings · Mentrixa",
};

export default async function SettingsPage() {
  const user = await requireAuth();
  const settings = await getUserSettings();

  return (
    <SettingsClient
      user={{ id: user.id, email: user.email ?? "", role: user.role }}
      settings={settings}
    />
  );
}
