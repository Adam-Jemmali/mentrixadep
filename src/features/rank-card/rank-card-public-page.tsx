import type { RankCardData } from "@/features/rank-card/types";
import { RankPassportPageClient } from "@/features/rank-card/rank-passport-page-client";
import { cn } from "@/shared/core/utils";
import Link from "next/link";
import { RankPassportTopBar } from "@/features/rank-card/rank-passport-article";

export function RankCardPublicPage({
  data,
  isOwner = false,
}: {
  data: RankCardData;
  isOwner?: boolean;
}) {
  return <RankPassportPageClient data={data} isOwner={isOwner} />;
}

export function RankCardPrivateNotice({ username }: { username: string }) {
  return (
    <div className="min-h-dvh bg-[var(--mx-navy)] text-slate-100">
      <div className="mx-auto max-w-lg px-4 pb-24 pt-8">
        <RankPassportTopBar />
        <div
          className={cn(
            "flex min-h-[50vh] flex-col items-center justify-center rounded-lg border border-white/10 bg-[var(--mx-navy-2)]/80 py-16 text-center",
          )}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--mx-indigo)]">
            @{username}
          </p>
          <h1 className="mt-4 text-3xl font-bold text-white">This passport is private</h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-[var(--mx-muted)]">
            The owner chose to keep this verified record private.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex rounded-md border border-[var(--mx-indigo)]/50 px-4 py-2 text-sm font-medium text-violet-300 hover:bg-white/5"
          >
            Back to Mentrixa
          </Link>
        </div>
      </div>
    </div>
  );
}
