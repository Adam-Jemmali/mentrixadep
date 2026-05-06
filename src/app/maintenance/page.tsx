import Link from "next/link";
import { MentrixaLogoMark } from "@/components/mentrixa-logo";
import { DEFAULT_PUBLIC_FEEDBACK_EMAIL, gmailWebComposeUrl } from "@/lib/mentrixa-brand";

export const dynamic = "force-dynamic";

export default function MaintenancePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050914] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.22),transparent_52%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.2),transparent_42%)]"
      />
      <section className="relative mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-8 py-10 shadow-2xl backdrop-blur-sm sm:px-12 sm:py-12">
          <div className="mx-auto mb-5 flex justify-center">
            <MentrixaLogoMark size="hero" priority />
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-200/80">Mentrixa platform</p>
          <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-5xl">
            We are polishing Mentrixa right now
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-slate-200 sm:text-base">
            Maintenance mode is currently active while we ship reliability updates. We will be back shortly so your
            learning flow continues smoothly.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex w-full items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#0B1120] transition-transform hover:-translate-y-0.5 sm:w-auto"
            >
              Refresh status
            </Link>
            <a
              href={gmailWebComposeUrl(DEFAULT_PUBLIC_FEEDBACK_EMAIL)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center rounded-xl border border-white/25 px-6 py-3 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 sm:w-auto"
            >
              Contact support
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
