import Link from "next/link";
import { cn } from "@/shared/core/utils";

const navLink =
  "rounded-full px-3 py-1.5 text-[13px] font-medium text-white/70 transition-colors hover:text-white";

export function LandingNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 h-14 border-b border-white/[0.06] bg-[var(--mx-navy)]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          prefetch={false}
          className="font-sans text-[15px] font-bold tracking-tight text-[var(--mx-violet)]"
        >
          MENTRIXA
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Landing">
          <Link href="/arena" className={navLink} prefetch={false}>
            Live Arena
          </Link>
        </nav>

        <Link
          href="/try"
          prefetch={false}
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-[var(--mx-violet)] px-4 py-2",
            "text-[13px] font-bold text-white transition-colors hover:bg-[var(--mx-primary-hover)]",
          )}
        >
          See where I rank
        </Link>
      </div>
    </header>
  );
}
