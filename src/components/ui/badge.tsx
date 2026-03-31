import * as React from "react";

import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "outline";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-mono font-medium tracking-tight",
        variant === "default" &&
          "border-mentrixa-500 bg-mentrixa-500/10 text-mentrixa-100",
        variant === "outline" &&
          "border-slate-300 bg-slate-50 text-slate-900",
        className,
      )}
      {...props}
    />
  );
}

