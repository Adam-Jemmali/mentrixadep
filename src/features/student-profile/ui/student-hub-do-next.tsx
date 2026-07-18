"use client";

import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import type { StudentHubDoNext } from "@/features/student-profile/student-hub-do-next-pure";
import { HubVocabIcon } from "@/features/student-profile/ui/hub-vocab-icon";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";

export function StudentHubDoNextCard({ action }: { action: StudentHubDoNext }) {
  return (
    <section
      className={`${mentrixStudent.card} border-2 border-violet-400 bg-gradient-to-br from-violet-50 to-white p-5 sm:p-6`}
      aria-label="Do this next"
    >
      <div className="flex items-center gap-2">
        <HubVocabIcon name={action.categoryIcon} title="Beat Line" size={28} />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-700">Beat Line</p>
      </div>

      <div className="mt-3 space-y-2">
        {action.lines.map((line) => (
          <p key={line.text} className="flex items-start gap-2 text-base font-bold text-zinc-900">
            <MentrixaVocabIcon name={line.icon} size={22} surface="light" title={line.text} />
            <span>{line.text}</span>
          </p>
        ))}
      </div>

      <Button asChild size="lg" className={`mt-4 ${mentrixStudent.hubBtnSolid}`}>
        <Link href={action.ctaHref} className="inline-flex items-center gap-2">
          <MentrixaVocabIcon name={action.ctaIcon} size={20} surface="dark" title={action.ctaLabel} />
          {action.ctaLabel}
        </Link>
      </Button>
    </section>
  );
}
