import { CheckCheck, X } from "lucide-react";
import { cn } from "@/shared/core/utils";
import {
  buildTierComparisonRows,
  type TierComparisonRow,
} from "@/features/pricing/pricing-tiers-pure";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { tierComparisonFeatureIcon } from "@/features/pricing/tier-comparison-feature-icon-pure";

function ComparisonCell({ value }: { value: TierComparisonRow["arena"] }) {
  if (value === "yes") {
    return <CheckCheck className="mx-auto h-4 w-4 text-indigo-600" aria-label="Included" />;
  }
  if (value === "paid") {
    return <span className="text-xs font-semibold text-violet-700">Pay</span>;
  }
  return <X className="mx-auto h-4 w-4 text-slate-300" aria-label="Not included" />;
}

export function TierComparisonTable({ className }: { className?: string }) {
  const rows = buildTierComparisonRows();
  return (
    <div className={cn("overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm", className)}>
      <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <p className="text-sm font-bold text-slate-900">What each tier includes</p>
        <p className="mt-1 text-xs text-slate-600">
          Three options only: free Arena, pay per session, or Momentum subscription.
        </p>
      </div>
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="px-4 py-3 font-bold text-slate-700">Feature</th>
            <th className="px-4 py-3 text-center font-bold text-slate-700">
              <span className="inline-flex items-center justify-center gap-1.5">
                <MentrixaVocabIcon name="tier-arena" size={16} className="text-indigo-600" title="Arena" />
                Arena (Free)
              </span>
            </th>
            <th className="px-4 py-3 text-center font-bold text-slate-700">
              <span className="inline-flex items-center justify-center gap-1.5">
                <MentrixaVocabIcon name="tier-breakthrough" size={16} className="text-violet-600" title="Breakthrough" />
                Breakthrough
              </span>
            </th>
            <th className="px-4 py-3 text-center font-bold text-indigo-700">
              <span className="inline-flex items-center justify-center gap-1.5">
                <MentrixaVocabIcon name="tier-momentum" size={16} className="text-indigo-700" title="Momentum" />
                Momentum
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.feature}
              className={cn("border-b border-slate-50", row.momentumExclusive && "bg-indigo-50/40")}
            >
              <td className="px-4 py-3 text-slate-800">
                <span className="inline-flex items-start gap-2">
                  <MentrixaVocabIcon
                    name={tierComparisonFeatureIcon(row.feature)}
                    size={16}
                    className="mt-0.5 shrink-0 text-slate-500"
                    title={row.feature}
                  />
                  <span>
                    {row.feature}
                    {row.momentumExclusive ? (
                      <span className="ml-2 text-[10px] font-black uppercase tracking-wide text-indigo-600">
                        Momentum only
                      </span>
                    ) : null}
                  </span>
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <ComparisonCell value={row.arena} />
              </td>
              <td className="px-4 py-3 text-center">
                <ComparisonCell value={row.breakthrough} />
              </td>
              <td className="px-4 py-3 text-center">
                <ComparisonCell value={row.momentum} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
