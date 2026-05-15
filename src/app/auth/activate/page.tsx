import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isWaitlistEnabled } from "@/lib/flags";
import { fetchRegistrationRequestRow } from "@/lib/registration-request-lookup";
import { ActivateAuthClient } from "@/components/auth/activate-auth-client";
import { findAuthUserByEmail, isGoogleOnlyAuthUser } from "@/lib/auth-user-lookup";
import { resolvePostAuthDestination } from "@/lib/post-auth-destination";

function normalizeEmail(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; role?: string }>;
}) {
  const params = await searchParams;
  const email = normalizeEmail(params.email);
  const requestedRole = params.role === "tutor" ? "tutor" : "student";
  if (!isValidEmail(email)) {
    redirect("/auth/signin");
  }

  const authUserForEmail = await findAuthUserByEmail(email);
  const hidePasswordCompletion = authUserForEmail != null && isGoogleOnlyAuthUser(authUserForEmail);

  if (!isWaitlistEnabled()) {
    const supabase = await createClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (currentUser && (currentUser.email ?? "").trim().toLowerCase() === email) {
      if (isGoogleOnlyAuthUser(currentUser)) {
        redirect(await resolvePostAuthDestination());
      }
      return <ActivateAuthClient email={email} role={requestedRole} hidePasswordCompletion={hidePasswordCompletion} />;
    }
    if (authUserForEmail != null) {
      redirect(`/auth/signin?email=${encodeURIComponent(email)}`);
    }
    return <ActivateAuthClient email={email} role={requestedRole} hidePasswordCompletion={false} />;
  }

  const admin = createAdminClient();
  const waitlistRow = await fetchRegistrationRequestRow(admin, email);

  if (!waitlistRow || waitlistRow.status !== "approved") {
    redirect("/auth/signup");
  }

  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  const role = waitlistRow.role === "tutor" ? "tutor" : "student";

  if (currentUser && (currentUser.email ?? "").trim().toLowerCase() === email) {
    if (isGoogleOnlyAuthUser(currentUser)) {
      redirect(await resolvePostAuthDestination());
    }
    return <ActivateAuthClient email={email} role={role} hidePasswordCompletion={hidePasswordCompletion} />;
  }

  return <ActivateAuthClient email={email} role={role} hidePasswordCompletion={hidePasswordCompletion} />;
}
