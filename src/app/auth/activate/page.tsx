import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isWaitlistEnabled } from "@/lib/flags";
import { fetchRegistrationRequestRow } from "@/lib/registration-request-lookup";
import { identityEmailKey } from "@/lib/email-identity";
import { ActivateAuthClient } from "@/components/auth/activate-auth-client";

function normalizeEmail(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function authUserExistsByEmail(email: string): Promise<boolean> {
  const admin = createAdminClient();
  const perPage = 200;
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("[auth/activate] listUsers failed:", error.message);
      return false;
    }

    const users = data?.users ?? [];
    if (
      users.some(
        (u) => identityEmailKey((u.email ?? "").trim()) === identityEmailKey(email),
      )
    ) {
      return true;
    }

    if (users.length < perPage) {
      return false;
    }
  }
  return false;
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

  if (!isWaitlistEnabled()) {
    const supabase = await createClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (currentUser && (currentUser.email ?? "").trim().toLowerCase() === email) {
      return <ActivateAuthClient email={email} role={requestedRole} />;
    }
    const hasAccount = await authUserExistsByEmail(email);
    if (hasAccount) {
      redirect(`/auth/signin?email=${encodeURIComponent(email)}`);
    }
    return <ActivateAuthClient email={email} role={requestedRole} />;
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
  if (currentUser && (currentUser.email ?? "").trim().toLowerCase() === email) {
    const role = waitlistRow.role === "tutor" ? "tutor" : "student";
    return <ActivateAuthClient email={email} role={role} />;
  }

  const role = waitlistRow.role === "tutor" ? "tutor" : "student";
  return <ActivateAuthClient email={email} role={role} />;
}
