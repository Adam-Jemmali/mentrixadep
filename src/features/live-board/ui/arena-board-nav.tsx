import Link from "next/link";
import { ARENA_PAGE_COPY } from "@/features/live-board/live-board-messages-pure";
import { cn } from "@/shared/core/utils";

/** Arena page minimal nav — no marketing shell links. */
export function ArenaBoardNav() {
  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 flex h-14 items-center border-b border-white/10",
        "bg-[var(--mx-navy)]/90 px-4 backdrop-blur-md sm:px-6",
      )}
    >
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4">
        <Link
          href="/"
          prefetch={false}
          className="text-[15px] font-bold tracking-[0.06em] text-[var(--mx-violet)]"
        >
          MENTRIXA
        </Link>
        <Link
          href="/"
          prefetch={false}
          className="cursor-pointer text-sm font-semibold text-[var(--mx-muted)] transition-colors hover:text-white"
        >
          {ARENA_PAGE_COPY.navBack}
        </Link>
      </div>
    </header>
  );
}
