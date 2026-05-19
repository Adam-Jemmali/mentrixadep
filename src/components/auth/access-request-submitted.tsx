import Link from "next/link";

export function AccessRequestSubmitted({
  email,
  roleLabel,
  message,
  awaitingAdmin = false,
  confirmationEmailSent = true,
}: {
  email: string;
  roleLabel: string;
  message: string | null;
  awaitingAdmin?: boolean;
  confirmationEmailSent?: boolean;
}) {
  return (
    <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500 scroll-mt-6">
      <p className="mb-3 inline-flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-900">
        {awaitingAdmin
          ? "Step complete — wait for admin approval"
          : confirmationEmailSent
            ? "Check your email for confirmation"
            : "Confirmation email pending"}
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
          ) : confirmationEmailSent ? (
            <>
              We emailed next steps to <span className="font-semibold text-slate-900">{email}</span>.
            </>
          ) : (
            <>
              Your onboarding request for <span className="font-semibold text-slate-900">{email}</span> is saved.
              The confirmation email is delayed — refresh this page in a minute or contact support@mentrixa.one if it
              does not arrive.
            </>
          )}
        </p>
        <p>Once approved, use the activation email to finish setup as {roleLabel}.</p>
      </div>
      <Link href="/auth/signin?signin=1" className="text-sm font-semibold text-mentrixa-600 hover:underline">
        Back to sign in
      </Link>
    </div>
  );
}
