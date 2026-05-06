import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { normalizeAccessStatus } from "@/lib/user-access-status";
import { getRoleHomePath } from "@/lib/role-home";

export default async function SuspendedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("status, approved, is_blacklisted, role")
    .eq("id", user.id)
    .maybeSingle();

  const accessStatus = normalizeAccessStatus(userRow);
  if (accessStatus === "approved" && userRow?.role) {
    redirect(getRoleHomePath(userRow.role));
  }
  if (accessStatus !== "suspended") {
    redirect("/auth/signin?error=approval_required");
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Account Suspended</h1>
      <p className="mt-3 text-sm text-slate-600">
        Your access is currently suspended. Please contact support@mentrixa.one if you believe this is a mistake.
      </p>
    </div>
  );
}
