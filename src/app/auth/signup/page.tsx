"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { isWaitlistEnabledClient } from "@/lib/flags";

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const email = searchParams.get("email")?.trim().toLowerCase();
    if (email) {
      router.push(`/auth/activate?email=${encodeURIComponent(email)}`);
      return;
    }

    router.push(isWaitlistEnabledClient() ? "/join" : "/auth/signin");
  }, [router, searchParams]);

  return (
    <div className="space-y-6 text-center">
      <h1 className="text-[24px] font-bold tracking-[-0.03em] text-slate-900 mb-1">
        Join Mentrixa
      </h1>
      <p className="text-sm text-slate-500 mb-5">
        We&apos;re currently accepting new members through our waitlist. Redirecting you now...
      </p>
      <p className="text-sm text-slate-400">
        If you&apos;re not automatically redirected,{" "}
        <Link href="/join" className="text-mentrixa-600 hover:underline">
          click here
        </Link>
        .
      </p>
    </div>
  );
}
