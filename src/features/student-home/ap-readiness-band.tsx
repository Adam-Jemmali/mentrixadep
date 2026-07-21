import type { ApReadinessBandView } from "@/features/student-home/ap-readiness-band-pure";
import { cn } from "@/shared/core/utils";

export function ApReadinessBand({
  band,
  className,
}: {
  band: ApReadinessBandView;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-[var(--radius-pill)] border border-white/10",
        "bg-[var(--mx-surface-3)]/80 px-3 py-1.5 backdrop-blur-sm",
        className,
      )}
      aria-label={`${band.label}. ${band.sublabel}`}
    >
      {band.score != null ? (
        <span
          className={cn(
            "font-[family-name:var(--font-playfair),serif] text-lg font-bold tabular-nums leading-none",
            band.isVerifiedPrediction ? "text-[var(--mx-gold)]" : "text-white",
          )}
        >
          {band.score}
        </span>
      ) : null}
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-white">{band.label}</span>
        <span className="block truncate text-[10px] text-[var(--mx-muted)]">{band.sublabel}</span>
      </span>
    </div>
  );
}
