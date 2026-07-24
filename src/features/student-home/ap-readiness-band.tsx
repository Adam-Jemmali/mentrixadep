import type { ApReadinessBandView } from "@/features/student-home/ap-readiness-band-pure";
import { LP_NUM_TITLE_CLASS } from "@/features/marketing/landing/ui/landing-number-motion-pure";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { cn } from "@/shared/core/utils";

export function ApReadinessBand({
  band,
  className,
  compact = false,
  display = "default",
}: {
  band: ApReadinessBandView;
  className?: string;
  compact?: boolean;
  /** Full width hero on public rank passport. */
  display?: "default" | "passport" | "page";
}) {
  const verifiedGold = band.isVerifiedPrediction && (band.score ?? 0) >= 4;

  if (display === "passport") {
    return (
      <div
        className={cn(
          "readiness-band rounded-lg border border-white/10 bg-[var(--mx-navy-2)]/80 p-5 sm:p-6",
          className,
        )}
        aria-label={`${band.label}. ${band.scoreCaption}. ${band.sublabel}`}
      >
        <div className="flex items-start gap-3">
          <MentrixaVocabIcon
            name="trajectory-certificate"
            size={32}
            surface="dark"
            gold={verifiedGold}
            title={band.label}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--mx-indigo)]">
              {band.label}
            </p>
            {band.score != null ? (
              <>
                <p className="mt-2 font-[family-name:var(--font-playfair),serif] text-[40px] font-bold leading-none tabular-nums text-white">
                  <span className={verifiedGold ? "text-[var(--mx-gold)]" : "text-white"}>{band.score}</span>
                  <span className="ml-1 text-lg text-[var(--mx-muted)]">{band.scoreSuffix}</span>
                </p>
                <p className="mt-2 text-[13px] text-[var(--mx-steel)]">{band.scoreCaption}</p>
              </>
            ) : (
              <p className="mt-2 text-sm leading-snug text-[var(--mx-muted)]">{band.sublabel}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (display === "page") {
    return (
      <div className={cn("space-y-1.5", className)} aria-label={`${band.label}. ${band.scoreCaption}. ${band.sublabel}`}>
        <div className="flex items-center gap-2">
          <MentrixaVocabIcon
            name="trajectory-certificate"
            size={22}
            surface="light"
            gold={verifiedGold}
            title={band.label}
          />
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--mx-indigo)]">{band.label}</p>
        </div>
        {band.score != null ? (
          <>
            <p className="font-[family-name:var(--font-playfair),serif] text-[2rem] font-bold leading-none tabular-nums text-[var(--mx-navy)]">
              <span className={verifiedGold ? "text-[var(--mx-gold)]" : "text-[var(--mx-navy)]"}>{band.score}</span>
              <span className="ml-1 text-base font-semibold text-[#475569]">{band.scoreSuffix}</span>
            </p>
            <p className="text-sm font-semibold text-[var(--mx-navy)]">{band.scoreCaption}</p>
            {band.sublabel ? <p className="text-xs leading-snug text-[#475569]">{band.sublabel}</p> : null}
          </>
        ) : (
          <p className="text-sm leading-snug text-[#475569]">{band.sublabel}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        compact
          ? "flex min-w-[9.5rem] flex-col justify-center rounded-lg border border-violet-300 bg-white/90 px-2.5 py-2 shadow-[1px_2px_0_rgba(11,18,32,0.08)]"
          : "inline-flex max-w-full items-center gap-2.5 rounded-[var(--radius-pill)] border border-violet-300 bg-white/90 px-3 py-1.5 shadow-[1px_2px_0_rgba(11,18,32,0.08)]",
        className,
      )}
      aria-label={`${band.label}. ${band.scoreCaption}. ${band.sublabel}`}
    >
      <div className={cn("flex items-start gap-2", compact && "flex-col gap-1.5")}>
        <MentrixaVocabIcon
          name="trajectory-certificate"
          size={compact ? 24 : 28}
          surface="light"
          gold={verifiedGold}
          title={band.label}
        />

        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[var(--mx-indigo)]">
            {band.label}
          </p>

          {band.score != null ? (
            <>
              <p className="mt-0.5 text-[10px] font-semibold text-[#475569]">{band.scoreCaption}</p>
              <p className="mt-0.5 flex items-baseline gap-1">
                <span
                  className={cn(
                    LP_NUM_TITLE_CLASS,
                    "text-[clamp(1.5rem,3vw,2rem)] opacity-100",
                    verifiedGold ? "text-[var(--mx-gold)]" : "text-[var(--mx-navy)]",
                  )}
                >
                  {band.score}
                </span>
                <span className="text-xs font-semibold text-[#475569]">{band.scoreSuffix}</span>
              </p>
            </>
          ) : (
            <p className="mt-1 text-[11px] leading-snug text-[#475569]">{band.sublabel}</p>
          )}

          {band.score != null && band.sublabel ? (
            <p className="mt-1 text-[10px] leading-snug text-[#475569]">{band.sublabel}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
