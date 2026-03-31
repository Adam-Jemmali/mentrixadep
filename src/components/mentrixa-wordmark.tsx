import { cn } from "@/lib/utils";

/** Matches landing / marketing header: gradient MEN + solid TRIXA. */
export function MentrixaWordmark({
  className,
  trixaClassName,
}: {
  className?: string;
  /** Color for the “TRIXA” half (e.g. white on dark nav). */
  trixaClassName?: string;
}) {
  return (
    <span className={cn("font-display font-bold text-lg tracking-tight", className)}>
    
      <span className={cn("text-text-primary", trixaClassName)}>MENTRIXA</span>
    </span>
  );
}
