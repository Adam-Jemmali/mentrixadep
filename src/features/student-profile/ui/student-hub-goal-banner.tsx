"use client";

import { usePathname } from "next/navigation";
import { MentrixaGoalStickyNote } from "@/features/marketing/ui/mentrixa-goal-sticky-note";

/** Hide on home — hero already carries the story; show on every other student product route. */
const HIDE_ON = new Set(["/student", "/student/"]);

export function StudentHubGoalBanner() {
  const pathname = usePathname() ?? "";
  if (HIDE_ON.has(pathname)) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-2 pt-4 sm:px-6">
      <MentrixaGoalStickyNote variant="student" density="compact" rotate={false} />
    </div>
  );
}
