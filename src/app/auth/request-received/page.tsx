import { redirect } from "next/navigation";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Legacy URL — same confirmation UI as signup onboarding. */
export default async function RequestReceivedPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; role?: string }>;
}) {
  const params = await searchParams;
  const email = (params.email ?? "").trim().toLowerCase();
  const role = params.role === "tutor" ? "tutor" : "student";

  if (!isValidEmail(email)) {
    redirect("/auth/signin");
  }

  redirect(
    `/auth/signup?access=submitted&email=${encodeURIComponent(email)}&role=${role}`,
  );
}
