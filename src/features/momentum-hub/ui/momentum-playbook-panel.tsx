"use client";

import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { cn } from "@/shared/core/utils";
import type { MomentumPlaybook } from "@/features/momentum-hub/momentum-value-equation-pure";
import { MomentumValueChipsRow } from "@/features/momentum-hub/ui/momentum-value-chips";

export function MomentumPlaybookPanel({ playbook }: { playbook: MomentumPlaybook }) {
  const { primary } = playbook;

  return (
    <section
      className={cn(
        mentrixStudent.card,
        "border-2 border-violet-400 bg-gradient-to-br from-violet-100/90 via-white to-indigo-50/80 p-5 sm:p-8",
      )}
      aria-label="Momentum playbook"
    >
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-700">
        Momentum Playbook · highest value move
      </p>
      <p className="mt-2 text-lg font-bold text-zinc-900 sm:text-xl">{primary.verdict}</p>
      <MomentumValueChipsRow chips={primary.chips} />
      <p className="mt-3 text-sm font-medium text-zinc-700">{primary.nextAction}</p>
      <Button asChild size="lg" className={cn("mt-4 w-full sm:w-auto", mentrixStudent.hubBtnSolid)}>
        <Link href={primary.href}>{primary.label}</Link>
      </Button>
    </section>
  );
}
