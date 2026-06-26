"use client";

import type { ReactNode } from "react";
import { GuestTryRoleBounce } from "@/features/quest/ui/guest-try-role-bounce";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";

export function TryQuestShell({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${mentrixStudent.pageBg} relative min-h-dvh overflow-hidden bg-[#0B1220] text-white`}
    >
      <GuestTryRoleBounce />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
