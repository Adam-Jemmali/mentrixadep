"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  approveGuidePortfolioEntry,
  skipGuidePortfolioEntry,
} from "@/features/guide-portfolio/actions";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { cn } from "@/shared/core/utils";

type Entry = {
  notificationId: string;
  portfolioId: string;
  body: string;
};

export function GuidePortfolioOptInStrip({ items }: { items: Entry[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (items.length === 0) return null;

  const first = items[0]!;

  return (
    <section
      className={cn(
        mentrixStudent.hubNotebook,
        "flex flex-wrap items-center justify-between gap-3 px-5 py-4",
      )}
    >
      <p className="max-w-xl text-sm font-semibold leading-snug text-[#0B1220]">
        {first.body}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              await approveGuidePortfolioEntry(first.portfolioId);
              router.refresh();
            });
          }}
          className={cn(
            "rounded-md bg-[#7C3AED] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white hover:bg-[#6D28D9]",
            pending && "opacity-70",
          )}
        >
          Approve
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              await skipGuidePortfolioEntry(first.portfolioId);
              router.refresh();
            });
          }}
          className={cn(
            "rounded-md border border-[#C4B5FD] bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#475569] hover:bg-[#F5F3FF]",
            pending && "opacity-70",
          )}
        >
          Skip
        </button>
      </div>
    </section>
  );
}
