import { redirect } from "next/navigation";
import Link from "next/link";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function RequestReceivedPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; role?: string }>;
}) {
  const params = await searchParams;
  const email = (params.email ?? "").trim().toLowerCase();
  const role = params.role === "tutor" ? "tutor" : "student";
  const roleLabel = role === "tutor" ? "Guide" : "Mentrixer";

  if (!isValidEmail(email)) {
    redirect("/auth/signin");
  }

  return (
    <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
      <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
        Request received
      </p>

      <h1 className="text-2xl font-bold text-slate-900 mb-2">
        Onboarding request received
      </h1>

      <p className="text-sm text-slate-600 mb-4">
        You&apos;re in Mentrixa onboarding as a{" "}
        <span className="font-semibold text-slate-900">{roleLabel}</span>. We sent a
        confirmation to{" "}
        <span className="font-semibold text-slate-900">{email}</span>.
      </p>

      <div className="text-left text-xs text-slate-600 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
        <p className="font-semibold text-slate-700">What happens next</p>
        <p>1) Check your inbox (and spam) for the confirmation email.</p>
        <p>2) We email you as soon as an admin approves your access.</p>
        <p>3) Once approved, come back and sign in with Google.</p>
        <p className="text-slate-400 pt-1">
          Until approval, sign in stays locked for this email.
        </p>
      </div>

      <Link
        href="/auth/signin"
        className="text-sm font-semibold text-mentrixa-600 hover:underline"
      >
        Back to sign in
      </Link>
    </div>
  );
}
