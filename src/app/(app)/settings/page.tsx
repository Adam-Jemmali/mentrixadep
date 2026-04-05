import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Settings · Mentrixa",
};

export default async function SettingsPage() {
  const user = await requireAuth();
  if (user.role === "student") {
    redirect(`/student/${user.id}`);
  }
  if (user.role === "tutor") {
    redirect(`/tutor/${user.id}`);
  }
  redirect("/admin/settings");
}
