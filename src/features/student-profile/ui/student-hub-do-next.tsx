"use client";

import Link from "next/link";
import { Zap } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import type { StudentHubDoNext } from "@/features/student-profile/student-hub-do-next-pure";

export function StudentHubDoNextCard({ action }: { action: StudentHubDoNext }) {
  return (
    <section
      className={`${mentrixStudent.card} border-2 border-violet-400 bg-gradient-to-br from-violet-50 to-white p-5 sm:p-6`}
      aria-label="Do this next"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#7C3AED] text-white shadow-sm">
          <Zap className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden />
        </span>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-700">Do this next</p>
      </div>
      <p className="mt-2 text-lg font-bold text-zinc-900">{action.verdict}</p>
      <Button asChild size="lg" className={`mt-4 ${mentrixStudent.hubBtnSolid}`}>
        <Link href={action.ctaHref}>{action.ctaLabel}</Link>
      </Button>
    </section>
  );
}
