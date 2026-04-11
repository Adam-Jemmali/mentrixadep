import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PendingApprovalContent } from "@/components/auth/PendingApprovalContent";
import { getRoleHomePath } from "@/lib/role-home";

export default async function PendingApprovalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const { data: userData } = await supabase
    .from("users")
    .select("approved, role")
    .eq("id", user.id)
    .single();

  if (userData?.approved) {
    redirect(getRoleHomePath(userData.role));
  }

  const email = user.email?.trim().toLowerCase() ?? "";
  let registrationStatus: "pending" | "rejected" = "pending";
  if (email) {
    const { data: regRow, error: regErr } = await supabase
      .from("registration_requests")
      .select("status")
      .eq("email", email)
      .maybeSingle();
    if (regErr) {
      console.error("[pending-approval] registration_requests:", regErr.message);
    } else if (regRow?.status === "rejected") {
      registrationStatus = "rejected";
    }
  }

  return (
    <PendingApprovalContent
      role={(userData?.role as "student" | "tutor" | "admin" | null) ?? null}
      registrationStatus={registrationStatus}
    />
  );
}
