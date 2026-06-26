"use client";

import { cn } from "@/shared/core/utils";
import { CircleSlash2, resolveDivisionFocusIcon } from "@/features/divisions/division-focus-icons";
import { MentrixaSelect } from "@/shared/ui/select-patterns";

export type DivisionFocusOption = { key: string; name: string };

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
  const options = divisions.map((d) => ({ id: d.key, label: d.name }));

  return (
    <MentrixaSelect
      options={options}
      value={showNoneOption ? (value ?? "__none__") : (value ?? divisions[0]?.key ?? "")}
      onChange={(id) => onValueChange(id === "__none__" || id == null ? null : id)}
      noneOption={showNoneOption ? { id: "__none__", label: noneLabel } : undefined}
      disabled={disabled}
      className={className}
      triggerClassName={cn("h-11", triggerClassName)}
      brandKind="mentrixer"
      placeholder={noneLabel}
      renderValue={(option) =>
        option ? (
          <span className="flex items-center gap-2.5 truncate">
            {(() => {
              const Icon = resolveDivisionFocusIcon(option.id, option.label);
              return <Icon className="h-4 w-4 shrink-0 text-indigo-500" aria-hidden />;
            })()}
            <span className="truncate font-mono text-[12px] font-semibold tracking-[0.08em] text-slate-950">
              {option.label}
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-2.5 truncate">
            <CircleSlash2 className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <span className="truncate font-mono text-[12px] font-semibold tracking-[0.08em] text-slate-700">
              {noneLabel}
            </span>
          </span>
        )
      }
      renderOption={(option) => {
        if (option.id === "__none__") {
          return (
            <span className="flex items-center gap-2.5">
              <CircleSlash2 className="h-4 w-4 text-slate-400" aria-hidden />
              <span className="font-mono text-[13px] font-semibold tracking-[0.08em] text-slate-800">
                {noneLabel}
              </span>
            </span>
          );
        }
        const Icon = resolveDivisionFocusIcon(option.id, option.label);
        return (
          <span className="flex items-center gap-2.5">
            <Icon className="h-4 w-4 text-indigo-500" aria-hidden />
            <span className="font-mono text-[13px] font-semibold tracking-[0.08em] text-slate-950">
              {option.label}
            </span>
          </span>
        );
      }}
    />
  );
}
