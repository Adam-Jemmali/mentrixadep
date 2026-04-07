import type { Metadata } from "next";
import Link from "next/link";
import { getSiteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Join Mentrixa",
  description:
    "Join Mentrixa with a referral link or create an account — live tutoring, quests, divisions, and progress tracking.",
  alternates: {
    canonical: `${getSiteUrl()}/join`,
  },
};

/** Bare route when visiting /join without ?ref= (middleware redirects /join?ref= to /auth/signup). */
export default function JoinPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-lg font-medium text-slate-900">Join Mentrixa</h1>
      <p className="mt-2 text-sm text-slate-600 leading-relaxed">
        This page is usually opened with a referral link. You can still create an account — ask your friend for
        their invite link, or continue below.
      </p>
      <Link
        href="/auth/signup"
        className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
      >
        Sign up
      </Link>
    </div>
  );
}
