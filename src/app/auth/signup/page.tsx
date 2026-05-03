import { redirect } from "next/navigation";
import { isWaitlistEnabled } from "@/lib/flags";
import { waitlistRoleFromQuery } from "@/lib/waitlist-role";
import { SignupFormClient } from "@/components/auth/signup-form-client";

/**
 * Entry point for “sign up” links (including waitlist approval emails).
 * Uses HTTP redirects so email clients and in-app browsers follow reliably;
 * approved users land on `/auth/activate` to finish account creation.
 */
export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; role?: string }>;
}) {
  const { email: emailParam, role: roleParam } = await searchParams;
  const email = (emailParam ?? "").trim().toLowerCase();
  if (email) {
    redirect(`/auth/activate?email=${encodeURIComponent(email)}`);
  }
  if (isWaitlistEnabled()) {
    const waitlistRole = waitlistRoleFromQuery(roleParam);
    redirect(`/join?role=${waitlistRole}`);
  }
  
  return <SignupFormClient />;
}
