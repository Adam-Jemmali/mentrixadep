"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to waitlist join page
    router.push("/join");
  }, [router]);

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
