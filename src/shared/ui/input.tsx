import * as React from "react";

import { cn } from "@/shared/core/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-base text-slate-900 caret-slate-900 transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mentrixa-400/50 focus-visible:ring-offset-0 focus-visible:border-mentrixa-400 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm input-premium [&:-webkit-autofill]:[-webkit-text-fill-color:#0f172a] [&:-webkit-autofill]:[box-shadow:0_0_0px_1000px_#fff_inset]",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };

