import { requireAuth } from "@/shared/core/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Settings · Mentrixa",
};

export default async function SettingsPage() {
  const user = await requireAuth();

  if (user.role === "admin") {
    redirect("/admin/settings");
  }

  if (user.role === "tutor") {
    redirect(`/tutor/${user.id}`);
  }

  redirect(`/student/${user.id}`);
}
