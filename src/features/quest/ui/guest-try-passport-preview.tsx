"use client";

import Link from "next/link";
import { RankPassportArticle } from "@/features/rank-card/rank-passport-article";
import type { RankCardData } from "@/features/rank-card/types";
import { AP_CALC_AB_SKILL_NODE_TOTAL } from "@/features/quest/guest-try-passport-preview-pure";
import { cn } from "@/shared/core/utils";

const VERIFIED_GOLD = "#D4A017";

export function GuestTryPassportPreview({
  data,
  className,
}: {
  data: RankCardData;
  className?: string;
}) {
  return (
    <div className={cn("mentrix-student-type-scope w-full", className)}>
      <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6366F1]">
        Passport preview
      </p>
      <RankPassportArticle
        data={data}
        previewMode
        totalSkillNodes={AP_CALC_AB_SKILL_NODE_TOTAL}
      />
      <p className="mt-4 text-center text-sm leading-relaxed text-[#475569]">
        This is the same public passport students get at{" "}
        <span className="font-mono text-[#6366F1]">mentrixa.one/rank/you</span>.{" "}
        <span style={{ color: VERIFIED_GOLD }}>Sign up to lock your first answers.</span>
      </p>
      <div className="mt-4 flex justify-center">
        <Link
          href="/auth/signup"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#6366F1] bg-[#7C3AED] px-5 text-sm font-semibold text-white shadow-[2px_3px_0_#0B1220] hover:bg-[#6D28D9]"
        >
          Save passport
        </Link>
      </div>
    </div>
  );
}
