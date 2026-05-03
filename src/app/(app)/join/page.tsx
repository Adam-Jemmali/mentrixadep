import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSiteUrl } from "@/lib/site";
import { WaitlistJoinForm } from "@/components/waitlist-join-form";
import { createAdminClient } from "@/lib/supabase/admin";
import { isWaitlistEnabled } from "@/lib/flags";
import { fetchRegistrationRequestRow } from "@/lib/registration-request-lookup";

export const metadata: Metadata = {
  title: "Join Mentrixa Waitlist",
  description:
    "Join the Mentrixa waitlist to get access to live tutoring, quests, divisions, and progress tracking.",
  alternates: {
    canonical: `${getSiteUrl()}/join`,
  },
};

/** Waitlist join page - main signup flow */
export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  if (!isWaitlistEnabled()) {
    redirect("/auth/signin");
  }

  const { email: emailParam } = await searchParams;
  const email = (emailParam ?? "").trim().toLowerCase();
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const admin = createAdminClient();
    const waitlistRow = await fetchRegistrationRequestRow(admin, email);

    if (waitlistRow?.status === "approved") {
      redirect(`/auth/activate?email=${encodeURIComponent(email)}`);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-blue-900 mb-2">Join Mentrixa</h1>
        <p className="text-sm text-slate-600">
          We&apos;re currently accepting new members. Enter your email to join the waitlist.
        </p>
      </div>
      <WaitlistJoinForm initialEmail={email} />
    </div>
  );
}
