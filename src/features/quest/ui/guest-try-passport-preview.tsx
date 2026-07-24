"use client";

import Link from "next/link";
import { RankPassportArticle } from "@/features/rank-card/rank-passport-article";
import type { RankCardData } from "@/features/rank-card/types";
import { AP_CALC_AB_SKILL_NODE_TOTAL } from "@/features/quest/guest-try-passport-preview-pure";
import { cn } from "@/shared/core/utils";

export function GuestTryPassportPreview({
  data,
  className,
}: {
  data: RankCardData;
  className?: string;
}) {
  return (
    <div className={cn("mentrix-student-type-scope w-full", className)}>
      <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--mx-indigo)]">
        Passport preview
      </p>
      <RankPassportArticle
        data={data}
        previewMode
        totalSkillNodes={AP_CALC_AB_SKILL_NODE_TOTAL}
      />
      <p className="mt-4 text-center text-sm leading-relaxed text-[#475569]">
        This is the same public passport students get at{" "}
        <span className="font-mono text-[var(--mx-indigo)]">mentrixa.one/rank/you</span>.{" "}
        <span className="text-[var(--mx-violet)]">Sign up to lock your first answers.</span>
      </p>
      <div className="mt-4 flex justify-center">
        <Link
          href="/auth/signup"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--mx-indigo)] bg-[var(--mx-violet)] px-5 text-sm font-semibold text-white shadow-[2px_3px_0_var(--mx-navy)] hover:bg-[var(--mx-primary-hover)]"
        >
          Save passport
        </Link>
      </div>
    </div>
  );
}
