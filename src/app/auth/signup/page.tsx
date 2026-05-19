import { redirect } from "next/navigation";
import { isWaitlistEnabled } from "@/lib/flags";
import { waitlistRoleFromQuery } from "@/lib/waitlist-role";
import { SignupFormClient } from "@/components/auth/signup-form-client";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Entry point for “sign up” links (including waitlist approval emails).
 * Uses HTTP redirects so email clients and in-app browsers follow reliably;
 * approved users land on `/auth/activate` to finish account creation.
 */
export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; role?: string; access?: string; error?: string; emailSent?: string }>;
}) {
  const params = await searchParams;
  const email = (params.email ?? "").trim().toLowerCase();
  const waitlistRole = waitlistRoleFromQuery(params.role);
  const accessSubmitted = params.access === "submitted";
  const confirmationEmailSent = params.emailSent !== "0";
  const initialError =
    params.error === "waitlist_rejected"
      ? "Your access request was not approved. You cannot sign up with this email. Contact support@mentrixa.one if this seems incorrect."
      : null;

  if (email && isValidEmail(email) && !accessSubmitted) {
    redirect(`/auth/activate?email=${encodeURIComponent(email)}&role=${waitlistRole}`);
  }

  const initialAccessSubmitted =
    accessSubmitted && isValidEmail(email)
      ? { email, role: waitlistRole, confirmationEmailSent }
      : undefined;

  return (
    <SignupFormClient
      initialRole={waitlistRole}
      initialAccessSubmitted={initialAccessSubmitted}
      initialError={initialError}
      waitlistEnabled={isWaitlistEnabled()}
    />
  );
}
