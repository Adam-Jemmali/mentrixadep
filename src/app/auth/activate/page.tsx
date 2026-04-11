import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { isWaitlistEnabled } from "@/lib/flags";
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
    if (users.some((u) => (u.email ?? "").trim().toLowerCase() === email)) {
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
  searchParams?: { email?: string };
}) {
  const email = normalizeEmail(searchParams?.email);
  if (!isValidEmail(email)) {
    redirect("/auth/signin");
  }

  if (!isWaitlistEnabled()) {
    const hasAccount = await authUserExistsByEmail(email);
    if (hasAccount) {
      redirect(`/auth/signin?email=${encodeURIComponent(email)}`);
    }
    return <ActivateAuthClient email={email} role="student" />;
  }

  const admin = createAdminClient();
  const { data: waitlistRow } = await admin
    .from("registration_requests")
    .select("status, role")
    .eq("email", email)
    .maybeSingle();

  if (!waitlistRow || waitlistRow.status !== "approved") {
    redirect(`/join?email=${encodeURIComponent(email)}`);
  }

  const hasAccount = await authUserExistsByEmail(email);
  if (hasAccount) {
    redirect(`/auth/signin?email=${encodeURIComponent(email)}`);
  }

  const role = waitlistRow.role === "tutor" ? "tutor" : "student";
  return <ActivateAuthClient email={email} role={role} />;
}
