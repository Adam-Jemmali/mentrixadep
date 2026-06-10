import { redirect } from "next/navigation";
import { createClient } from "@/shared/integrations/supabase/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { isWaitlistEnabled } from "@/shared/core/flags";
import { fetchRegistrationRequestRow } from "@/features/registration/registration-request-lookup";
import { ActivateAuthClient } from "@/features/auth/ui/activate-auth-client";
import {
  authUserHasGoogleProvider,
  findAuthUserByEmail,
  isGoogleOnlyAuthUser,
} from "@/shared/core/auth-user-lookup";
import { resolvePostAuthDestination } from "@/shared/core/post-auth-destination";

function normalizeEmail(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; role?: string; google?: string }>;
}) {
  const params = await searchParams;
  const email = normalizeEmail(params.email);
  const requestedRole = params.role === "tutor" ? "tutor" : "student";
  const preferGoogleFinish = params.google === "1";
  if (!isValidEmail(email)) {
    redirect("/auth/signin?signin=1");
  }

  const authUserForEmail = await findAuthUserByEmail(email);
  const googleSignInPreferred =
    preferGoogleFinish ||
    (authUserForEmail != null && authUserHasGoogleProvider(authUserForEmail));

  if (!isWaitlistEnabled()) {
    const supabase = await createClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (currentUser && (currentUser.email ?? "").trim().toLowerCase() === email) {
      if (isGoogleOnlyAuthUser(currentUser)) {
        redirect(await resolvePostAuthDestination());
      }
      return <ActivateAuthClient email={email} role={requestedRole} googleSignInPreferred={googleSignInPreferred} />;
    }
    if (authUserForEmail != null) {
      redirect(`/auth/signin?signin=1&email=${encodeURIComponent(email)}`);
    }
      return <ActivateAuthClient email={email} role={requestedRole} googleSignInPreferred={false} />;
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
    return <ActivateAuthClient email={email} role={role} googleSignInPreferred={googleSignInPreferred} />;
  }

  return <ActivateAuthClient email={email} role={role} googleSignInPreferred={googleSignInPreferred} />;
}
