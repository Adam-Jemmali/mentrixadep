"use client";

import { useEffect } from "react";
import Link from "next/link";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { mentrixHubSurfaces } from "@/features/student-profile/student-hub-surfaces";

export function StudentRouteError({
  error,
  reset,
  routeLabel = "student",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  routeLabel?: string;
}) {
  useEffect(() => {
    console.error(`[${routeLabel}] page error:`, error.digest ?? error.message);
  }, [error, routeLabel]);

  const showDetails = process.env.NODE_ENV !== "production";

  return (
    <div className={mentrixStudent.pageBgArena}>
      <div className={mentrixStudent.main}>
        <div className={mentrixStudent.hubNotebook}>
          <h1 className={mentrixHubSurfaces.inkTitle}>Something went wrong</h1>
          <p className={`mt-2 ${mentrixHubSurfaces.inkMuted}`}>
            This page failed to load. Try again or return to your dashboard.
          </p>
          {showDetails ? (
            <pre className="mt-4 overflow-x-auto rounded-lg border border-violet-300 bg-white/70 p-3 text-xs text-[var(--mx-navy)]">
              {error.message}
            </pre>
          ) : null}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => reset()} className={mentrixStudent.hubBtnSolid}>
              Try again
            </button>
            <Link href="/student" className={mentrixStudent.hubGhostLink}>
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
