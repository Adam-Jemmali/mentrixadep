import { redirect } from "next/navigation";
import { isWaitlistEnabled } from "@/lib/flags";

/**
 * Entry point for “sign up” links (including waitlist approval emails).
 * Uses HTTP redirects so email clients and in-app browsers follow reliably;
 * approved users land on `/auth/activate` to finish account creation.
 */
export default function SignUpPage({
  searchParams,
}: {
  searchParams?: { email?: string };
}) {
  const email = (searchParams?.email ?? "").trim().toLowerCase();
  if (email) {
    redirect(`/auth/activate?email=${encodeURIComponent(email)}`);
  }
  if (isWaitlistEnabled()) {
    redirect("/join");
  }
  redirect("/auth/signin");
}
