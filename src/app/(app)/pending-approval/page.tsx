import { createClient } from "@/shared/integrations/supabase/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { redirect } from "next/navigation";
import { PendingApprovalContent } from "@/features/auth/ui/PendingApprovalContent";
import { PendingApprovalRealtimeRefresh } from "@/features/auth/ui/PendingApprovalRealtimeRefresh";
import { getPostApprovalRedirectPath } from "@/shared/core/post-approval-redirect";
import { normalizeAccessStatus } from "@/shared/core/user-access-status";
import { fetchRegistrationRequestRow } from "@/features/registration/registration-request-lookup";
import { syncApprovedWaitlistToUserProfile } from "@/features/registration/waitlist-user-sync";

export default async function PendingApprovalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin?signin=1");
  }

  const email = user.email?.trim().toLowerCase() ?? "";
  if (email) {
    let regApproved = false;
    try {
      const admin = createAdminClient();
      const regRow = await fetchRegistrationRequestRow(admin, email);
      regApproved = regRow?.status === "approved";
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[pending-approval] approved-check:", message);
    }
    if (regApproved) {
      await syncApprovedWaitlistToUserProfile(user.id, user.email);
      redirect("/auth/session-sync");
    }
  }

  await syncApprovedWaitlistToUserProfile(user.id, user.email);

  const { data: userData } = await supabase
    .from("users")
    .select("status, approved, role, is_blacklisted")
    .eq("id", user.id)
    .single();

  const accessStatus = normalizeAccessStatus(userData);
  if (accessStatus === "approved" && userData?.role) {
    redirect(
      await getPostApprovalRedirectPath({
        userId: user.id,
        role: userData.role,
      }),
    );
  }
  if (accessStatus === "suspended") {
    redirect("/suspended");
  }

  let registrationStatus: "pending" | "rejected" = "pending";
  if (email) {
    try {
      const admin = createAdminClient();
      const regRow = await fetchRegistrationRequestRow(admin, email);
      if (regRow?.status === "rejected") {
        registrationStatus = "rejected";
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[pending-approval] registration_requests:", message);
    }
  }

  return (
    <>
      {registrationStatus === "pending" ? (
        <PendingApprovalRealtimeRefresh userId={user.id} email={email} />
      ) : null}
      <PendingApprovalContent
        role={(userData?.role as "student" | "tutor" | "admin" | null) ?? null}
        registrationStatus={registrationStatus}
      />
    </>
  );
}
