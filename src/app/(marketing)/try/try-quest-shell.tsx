"use client";

import type { ReactNode } from "react";
import { GuestTryRoleBounce } from "@/features/quest/ui/guest-try-role-bounce";

/** Paper desk shell — same readable ink as student Quest. */
export function TryQuestShell({ children }: { children: ReactNode }) {
  return (
    <div className="mentrix-student-type-scope mx-hub-desk relative min-h-dvh overflow-hidden text-[#0B1220]">
      <GuestTryRoleBounce />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
