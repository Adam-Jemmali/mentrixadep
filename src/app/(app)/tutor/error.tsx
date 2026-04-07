"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function TutorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[tutor] page error:", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col justify-center px-4 py-16">
      <h1 className="text-lg font-medium text-slate-900">Guide center unavailable</h1>
      <p className="mt-2 text-sm text-slate-600">
        Something went wrong loading this page. You can try again or return home.
      </p>
      {process.env.NODE_ENV === "development" ? (
        <pre className="mt-4 overflow-x-auto rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">
          {error.message}
        </pre>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-2">
        <Button type="button" onClick={() => reset()}>
          Try again
        </Button>
        <Button variant="outline" type="button" asChild>
          <Link href="/">Home</Link>
        </Button>
      </div>
    </div>
  );
}
