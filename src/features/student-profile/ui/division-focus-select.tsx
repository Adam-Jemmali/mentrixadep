"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/shared/ui/select";
import { cn } from "@/shared/core/utils";
import { CircleSlash2, resolveDivisionFocusIcon } from "@/features/divisions/division-focus-icons";

export type DivisionFocusOption = { key: string; name: string };

const TRIGGER_CLASS =
  "h-11 rounded-xl border border-indigo-200 bg-white text-slate-950 shadow-sm focus:ring-2 focus:ring-indigo-500/30";

const CONTENT_CLASS =
  "z-[120] max-h-72 border border-indigo-200 bg-white text-slate-950 shadow-xl";

const ITEM_CLASS =
  "py-2 text-slate-900 data-[highlighted]:bg-indigo-50 data-[highlighted]:text-slate-950 data-[state=checked]:bg-indigo-100/70 data-[state=checked]:text-slate-950";

type DivisionFocusSelectProps = {
  value: string | null;
  onValueChange: (key: string | null) => void;
  divisions: DivisionFocusOption[];
  noneLabel?: string;
  /** When false, omits the empty/none row (required pickers like quest subject). */
  showNoneOption?: boolean;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
};

export function DivisionFocusSelect({
  value,
  onValueChange,
  divisions,
  noneLabel = "None",
  showNoneOption = true,
  disabled = false,
  className,
  triggerClassName,
}: DivisionFocusSelectProps) {
  const selected = divisions.find((d) => d.key === value) ?? null;

  return (
    <Select
      value={showNoneOption ? (value ?? "__none__") : (value ?? divisions[0]?.key ?? "")}
      onValueChange={(v) => onValueChange(v === "__none__" ? null : v)}
      disabled={disabled}
    >
      <SelectTrigger className={cn(TRIGGER_CLASS, triggerClassName, className)}>
        {selected ? (
          <span className="flex items-center gap-2.5 truncate">
            {(() => {
              const Icon = resolveDivisionFocusIcon(selected.key, selected.name);
              return <Icon className="h-4 w-4 shrink-0 text-indigo-500" aria-hidden />;
            })()}
            <span className="truncate font-mono text-[12px] font-semibold tracking-[0.08em] text-slate-950">
              {selected.name}
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-2.5 truncate">
            <CircleSlash2 className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <span className="truncate font-mono text-[12px] font-semibold tracking-[0.08em] text-slate-700">
              {noneLabel}
            </span>
          </span>
        )}
      </SelectTrigger>
      <SelectContent className={CONTENT_CLASS}>
        {showNoneOption ? (
          <SelectItem value="__none__" className={ITEM_CLASS}>
            <span className="flex items-center gap-2.5">
              <CircleSlash2 className="h-4 w-4 text-slate-400" aria-hidden />
              <span className="font-mono text-[13px] font-semibold tracking-[0.08em] text-slate-800">
                {noneLabel}
              </span>
            </span>
          </SelectItem>
        ) : null}
        {divisions.map((d) => {
          const Icon = resolveDivisionFocusIcon(d.key, d.name);
          return (
            <SelectItem key={d.key} value={d.key} className={ITEM_CLASS}>
              <span className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 text-indigo-500" aria-hidden />
                <span className="font-mono text-[13px] font-semibold tracking-[0.08em] text-slate-950">
                  {d.name}
                </span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
