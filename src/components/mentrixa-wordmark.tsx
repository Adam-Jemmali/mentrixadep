import { cn } from "@/shared/core/utils";
import { Typewriter } from "@/shared/ui/typewriter";

/** Matches landing / marketing header: gradient MEN + solid TRIXA. */
export function MentrixaWordmark({
  className,
  trixaClassName,
}: {
  className?: string;
  trixaClassName?: string;
}) {
  return (
    <span className={cn("font-display font-black text-xl tracking-tight inline-flex items-center", className, trixaClassName)}>
      <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
        <Typewriter 
          text="MENTRIXA" 
          speed={100} 
          waitTime={10000} 
          cursorChar="_" 
          cursorClassName="text-purple-500" 
        />
      </span>
    </span>
  );
}
