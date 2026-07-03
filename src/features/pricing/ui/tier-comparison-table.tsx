import { CheckCheck, X } from "lucide-react";
import { cn } from "@/shared/core/utils";
import { mentrixBrandUi } from "@/features/marketing/mentrix-brand-colors";
import {
  buildTierComparisonRows,
  type TierComparisonRow,
} from "@/features/pricing/pricing-tiers-pure";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { tierComparisonFeatureIcon } from "@/features/pricing/tier-comparison-feature-icon-pure";
import { PricingTierIcon } from "@/features/pricing/ui/pricing-tier-visual";

function ComparisonCell({
  value,
  dark,
}: {
  value: TierComparisonRow["arena"];
  dark?: boolean;
}) {
  if (value === "yes") {
    return (
      <CheckCheck
        className={cn("mx-auto h-4 w-4", dark ? "text-violet-300" : "text-indigo-600")}
        aria-label="Included"
      />
    );
  }
  if (value === "paid") {
    return (
      <span className={cn("text-xs font-semibold", dark ? "text-violet-200" : "text-violet-700")}>
        Pay
      </span>
    );
  }
  return (
    <X
      className={cn("mx-auto h-4 w-4", dark ? "text-violet-500/40" : "text-slate-300")}
      aria-label="Not included"
    />
  );
}

export function TierComparisonTable({
  className,
  variant = "light",
}: {
  className?: string;
  variant?: "light" | "dark";
}) {
  const rows = buildTierComparisonRows();
  const dark = variant === "dark";

  return (
    <div
      className={cn(
        "overflow-x-auto rounded-2xl shadow-sm",
        dark
          ? mentrixBrandUi.tableShell
          : "border border-slate-200 bg-white",
        className,
      )}
    >
      <div
        className={cn(
          "border-b px-4 py-3",
          dark
            ? "border-indigo-500/30 bg-violet-950/50"
            : "border-slate-100 bg-slate-50/80",
        )}
      >
        <p className={cn("text-sm font-bold", dark ? "text-white" : "text-slate-900")}>
          Feature matrix
        </p>
      </div>
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className={cn("border-b", dark ? "border-indigo-500/25" : "border-slate-100")}>
            <th className={cn("px-4 py-3 font-bold", dark ? "text-indigo-200" : "text-slate-700")}>
              Feature
            </th>
            <th className={cn("px-4 py-3 text-center font-bold", dark ? "text-indigo-200" : "text-slate-700")}>
              <span className="inline-flex flex-col items-center justify-center gap-1">
                <PricingTierIcon tier="arena" size={36} title="Arena" />
                Arena
              </span>
            </th>
            <th className={cn("px-4 py-3 text-center font-bold", dark ? "text-indigo-200" : "text-slate-700")}>
              <span className="inline-flex flex-col items-center justify-center gap-1">
                <PricingTierIcon tier="breakthrough" size={36} title="Breakthrough" />
                Breakthrough
              </span>
            </th>
            <th className={cn("px-4 py-3 text-center font-bold", dark ? "text-violet-200" : "text-indigo-700")}>
              <span className="inline-flex flex-col items-center justify-center gap-1">
                <PricingTierIcon tier="momentum" size={36} title="Momentum" />
                Momentum
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.feature}
              className={cn(
                "border-b",
                dark ? "border-indigo-500/15" : "border-slate-50",
                row.momentumExclusive && (dark ? "bg-violet-500/10" : "bg-indigo-50/40"),
              )}
            >
              <td className={cn("px-4 py-3", dark ? "text-violet-100" : "text-slate-800")}>
                <span className="inline-flex items-start gap-2">
                  <MentrixaVocabIcon
                    name={tierComparisonFeatureIcon(row.feature)}
                    size={16}
                    className={cn("mt-0.5 shrink-0", dark ? "text-violet-300/70" : "text-slate-500")}
                    title={row.feature}
                    surface={dark ? "dark" : "light"}
                  />
                  <span>
                    {row.feature}
                    {row.momentumExclusive ? (
                      <span
                        className={cn(
                          "ml-2 text-[10px] font-black uppercase tracking-wide",
                          dark ? "text-violet-300" : "text-indigo-600",
                        )}
                      >
                        Momentum only
                      </span>
                    ) : null}
                  </span>
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <ComparisonCell value={row.arena} dark={dark} />
              </td>
              <td className="px-4 py-3 text-center">
                <ComparisonCell value={row.breakthrough} dark={dark} />
              </td>
              <td className="px-4 py-3 text-center">
                <ComparisonCell value={row.momentum} dark={dark} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
