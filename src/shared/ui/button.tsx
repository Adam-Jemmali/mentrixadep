"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/shared/core/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center cursor-pointer gap-2 whitespace-nowrap rounded-xl text-sm font-semibold tracking-tight transition-[background,color,box-shadow,transform,border-color] duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "mx-cta-primary text-white",
        workbenchPrimary:
          "bg-indigo-600 text-white border border-indigo-400/70 shadow-[0_8px_0_#3730a3] active:translate-y-[3px] active:shadow-[0_4px_0_#3730a3]",
        workbenchSecondary:
          "bg-slate-800 text-slate-100 border border-slate-600 hover:bg-slate-700",
        arenaPrimary:
          "bg-violet-600 text-white border border-violet-300/70 shadow-[0_8px_0_#4338ca] active:translate-y-[3px] active:shadow-[0_4px_0_#4338ca]",
        arenaSecondary:
          "bg-indigo-500 text-white border border-indigo-200/70 shadow-[0_8px_0_#4338ca] active:translate-y-[3px] active:shadow-[0_4px_0_#4338ca]",
        destructive:
          "bg-red-600 text-white border border-red-400 shadow-[0_8px_0_#991b1b] active:translate-y-[3px] active:shadow-[0_4px_0_#991b1b]",
        secondary:
          "bg-white text-slate-900 border border-slate-300 hover:bg-slate-50",
        outline:
          "bg-white text-slate-900 border border-slate-300 hover:bg-slate-50",
        ghost:
          "bg-transparent text-slate-700 hover:bg-slate-100",
        link: "text-indigo-600 underline-offset-4 hover:underline",
        cool:
          "bg-indigo-600/15 border border-indigo-300/30 text-indigo-200 hover:bg-indigo-600/25",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-4 text-xs",
        lg: "h-11 px-7 text-base",
        xl: "h-12 px-8",
        xxl: "h-14 px-10",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        data-click-sound="true"
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
