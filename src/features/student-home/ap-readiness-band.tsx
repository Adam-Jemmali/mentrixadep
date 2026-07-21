import type { ApReadinessBandView } from "@/features/student-home/ap-readiness-band-pure";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
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
        "inline-flex max-w-full items-center gap-2.5 rounded-[var(--radius-pill)] border border-[#C4B5FD]",
        "bg-white/90 px-3 py-1.5 shadow-[1px_2px_0_rgba(11,18,32,0.08)]",
        className,
      )}
      aria-label={`${band.label}. ${band.sublabel}`}
    >
      <MentrixaVocabIcon
        name="trajectory-certificate"
        size={28}
        surface="light"
        gold={band.isVerifiedPrediction}
        title="AP readiness band"
      />
      {band.score != null ? (
        <span
          className={cn(
            "font-[family-name:var(--font-playfair),serif] text-lg font-bold tabular-nums leading-none",
            band.isVerifiedPrediction ? "text-[var(--mx-gold)]" : "text-[#0B1220]",
          )}
        >
          {band.score}
        </span>
      ) : null}
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-[#0B1220]">{band.label}</span>
        <span className="block truncate text-[10px] text-[#475569]">{band.sublabel}</span>
      </span>
    </div>
  );
}
