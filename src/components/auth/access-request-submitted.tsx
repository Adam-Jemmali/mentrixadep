import Link from "next/link";

export function AccessRequestSubmitted({
  email,
  roleLabel,
  message,
  awaitingAdmin = false,
}: {
  email: string;
  roleLabel: string;
  message: string | null;
  awaitingAdmin?: boolean;
}) {
  return (
    <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500 scroll-mt-6">
      <p className="mb-3 inline-flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-900">
        {awaitingAdmin
          ? "Step complete — wait for admin approval"
          : "Step complete — check your email for confirmation"}
      </p>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">
        {awaitingAdmin ? "Waiting for admin approval" : "Access request submitted"}
      </h1>
      <p className="text-sm text-slate-600 mb-4">
        {message ?? `We've received your ${roleLabel} onboarding request.`}
      </p>
      <div className="text-left text-xs text-slate-600 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1.5">
        <p>
          {awaitingAdmin ? (
            <>
              We&apos;ll use <span className="font-semibold text-slate-900">{email}</span> for status updates. If you
              just joined, you should also get a confirmation email (check spam).
            </>
          ) : (
            <>
              We emailed next steps to <span className="font-semibold text-slate-900">{email}</span>.
            </>
          )}
        </p>
        <p>Once approved, use the activation email to finish setup (Google or password) and sign in as {roleLabel}.</p>
      </div>
      <Link href="/auth/signin" className="text-sm font-semibold text-mentrixa-600 hover:underline">
        Back to sign in
      </Link>
    </div>
  );
}
