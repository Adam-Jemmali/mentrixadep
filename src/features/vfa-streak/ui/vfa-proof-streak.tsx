import { vfaProofStreakLabel, vfaStreakBrokenCopy } from "@/features/vfa-streak/vfa-streak-pure";
import type { VfaStreakHomeDisplay } from "@/features/vfa-streak/vfa-streak-pure";

import { VERIFIED_GOLD_CSS } from "@/components/ui/mentrixa-ui-tokens";

const GOLD = VERIFIED_GOLD_CSS;

export function VfaProofStreakDisplay({ display }: { display: VfaStreakHomeDisplay }) {
  if (display.kind === "none") return null;

  if (display.kind === "broken") {
    return (
      <p className="w-full text-sm text-slate-600 sm:w-auto">
        {vfaStreakBrokenCopy(display.endedDays)}
      </p>
    );
  }

  return (
    <p
      className="text-sm font-medium text-slate-700"
      aria-label={`${display.days} ${vfaProofStreakLabel(display.days)}`}
    >
      <span className="font-mono font-bold tabular-nums" style={{ color: GOLD }}>
        {display.days}
      </span>{" "}
      {vfaProofStreakLabel(display.days)}
    </p>
  );
}
