"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Thin top bar pulse on route changes — instant perceived feedback during App Router navigations.
 */
function NavigationProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    setPulse((p) => p + 1);
  }, [routeKey]);

  return (
    <div
      key={pulse}
      aria-hidden
      className="pointer-events-none fixed left-0 right-0 top-0 z-[1000] h-[2px] overflow-hidden"
    >
      <div className="nav-route-progress h-full w-full" />
    </div>
  );
}

export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  );
}
