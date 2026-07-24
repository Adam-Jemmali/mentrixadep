"use client";

import { cn } from "@/shared/core/utils";

/** Duel stake slider — navy track, violet fill, white thumb. */
export function DuelWagerSlider({
  min = 0,
  max,
  value,
  onValueChange,
  className,
  id = "duel-wager-slider",
}: {
  min?: number;
  max: number;
  value: number;
  onValueChange: (value: number) => void;
  className?: string;
  id?: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;

  return (
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={1}
      value={value}
      onChange={(e) => onValueChange(Number(e.target.value))}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label="Stake amount in XP"
      className={cn(
        "h-2 w-full cursor-pointer appearance-none rounded-full",
        "[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[var(--mx-violet)] [&::-moz-range-thumb]:bg-white",
        "[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--mx-violet)] [&::-webkit-slider-thumb]:bg-white",
        className,
      )}
      style={{
        background: `linear-gradient(to right, var(--mx-violet) 0%, var(--mx-violet) ${pct}%, #334155 ${pct}%, #334155 100%)`,
      }}
    />
  );
}
