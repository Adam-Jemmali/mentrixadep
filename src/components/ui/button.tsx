"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { useUiPerfTier } from "@/lib/use-ui-perf-tier"

/* ────────────────────────────────────────────────────────
 * Mentrixa Liquid-Glass Button
 *
 * Every <Button> in the app renders with the liquid-glass
 * distortion effect + mouse-tracking zigzag color gradient
 * using the Mentrixa brand palette (blue → indigo → cyan).
 *
 * Variant & size APIs remain backwards-compatible.
 * ──────────────────────────────────────────────────────── */

const buttonVariants = cva(
  "inline-flex items-center justify-center cursor-pointer gap-2 whitespace-nowrap rounded-full text-sm font-semibold tracking-tight transition-[color,box-shadow,transform] duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "text-mentrixa-600",
        destructive:
          "text-red-600",
        secondary:
          "text-slate-700",
        outline:
          "text-slate-700",
        ghost:
          "text-slate-600",
        link: "text-mentrixa-700 underline-offset-4 hover:underline",
        cool: "text-mentrixa-600",
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

/**
 * The Mentrixa brand colors used in the liquid zigzag hover gradient.
 */
const MENTRIXA_COLORS = [
  "rgba(37, 99, 235, 0.55)",   // blue-600
  "rgba(79, 70, 229, 0.50)",   // indigo-600
  "rgba(6, 182, 212, 0.45)",   // cyan-500
  "rgba(59, 130, 246, 0.50)",  // blue-500
  "rgba(139, 92, 246, 0.45)",  // violet-500
  "rgba(37, 99, 235, 0.55)",   // blue-600 repeat
]

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {

    /* ── link variant: plain text, no glass ── */
    if (variant === "link") {
      const Comp = asChild ? Slot : "button"
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          data-click-sound="true"
          {...props}
        >
          {children}
        </Comp>
      )
    }

    /* ── ghost variant: subtle, no full glass ── */
    if (variant === "ghost") {
      const Comp = asChild ? Slot : "button"
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }), "hover:bg-slate-100 active:scale-[0.97] transition-all")}
          ref={ref}
          data-click-sound="true"
          {...props}
        >
          {children}
        </Comp>
      )
    }

    /* ── All other variants: wrap with liquid glass ── */
    if (asChild) {
      /* When asChild, <Slot> merges into the child (e.g. <Link>).
         We can't inject divs inside, so we wrap externally. */
      return (
        <LiquidGlassWrapper variant={variant} size={size} className={className}>
          <Slot ref={ref} data-click-sound="true" className="h-full w-full appearance-none border-none bg-transparent p-0 outline-none flex items-center justify-center gap-2" {...props}>
            {children}
          </Slot>
        </LiquidGlassWrapper>
      )
    }

    return (
      <LiquidGlassWrapper variant={variant} size={size} className={className}>
        <button ref={ref} data-click-sound="true" className="h-full w-full appearance-none border-none bg-transparent p-0 outline-none flex items-center justify-center gap-2" {...props}>
          {children}
        </button>
      </LiquidGlassWrapper>
    )
  },
)
Button.displayName = "Button"

/* ────────────────────────────────────────────────
 * Liquid Glass Wrapper
 * Renders the glass shell around any child element.
 * Tracks mouse position for the zigzag color gradient.
 * ──────────────────────────────────────────────── */

interface LiquidGlassWrapperProps {
  children: React.ReactNode
  variant?: ButtonProps["variant"]
  size?: ButtonProps["size"]
  className?: string
}

function LiquidGlassWrapper({ children, variant, size, className }: LiquidGlassWrapperProps) {
  const tier = useUiPerfTier()
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const [mouse, setMouse] = React.useState({ x: 50, y: 50 })
  const [isHovered, setIsHovered] = React.useState(false)
  const rafMoveRef = React.useRef<number | null>(null)
  const pendingMoveRef = React.useRef({ x: 50, y: 50 })

  React.useEffect(
    () => () => {
      if (rafMoveRef.current != null) {
        cancelAnimationFrame(rafMoveRef.current)
      }
    },
    [],
  )

  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (tier === "lite") return
      const rect = e.currentTarget.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      pendingMoveRef.current = { x, y }
      if (rafMoveRef.current != null) return
      rafMoveRef.current = requestAnimationFrame(() => {
        rafMoveRef.current = null
        setMouse(pendingMoveRef.current)
      })
    },
    [tier],
  )

  const handleMouseEnter = React.useCallback(() => setIsHovered(true), [])
  const handleMouseLeave = React.useCallback(() => {
    setIsHovered(false)
    setMouse({ x: 50, y: 50 })
    pendingMoveRef.current = { x: 50, y: 50 }
    if (rafMoveRef.current != null) {
      cancelAnimationFrame(rafMoveRef.current)
      rafMoveRef.current = null
    }
  }, [])

  /* Full tier: conic follows cursor (throttled). Lite: static diagonal wash — no per-pixel React updates. */
  const liquidGradient =
    !isHovered
      ? "none"
      : tier === "lite"
        ? "linear-gradient(135deg, rgba(37,99,235,0.28), rgba(139,92,246,0.22), rgba(6,182,212,0.18))"
        : `conic-gradient(from ${(mouse.x * 3.6)}deg at ${mouse.x}% ${mouse.y}%, ${MENTRIXA_COLORS.join(", ")})`

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "group/glass relative inline-flex rounded-full transition-transform duration-150 ease-out hover:scale-[1.03] active:scale-[0.97]",
        tier === "lite" && "hover:scale-[1.015]",
        buttonVariants({ variant, size, className }),
      )}
      onMouseMove={tier === "lite" ? undefined : handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Static glass border — always visible */}
      <div
        className="pointer-events-none absolute inset-0 z-0 rounded-full transition-shadow duration-200 ease-out"
        style={{
          boxShadow: isHovered
            ? "0 0 8px rgba(37,99,235,0.15), 0 2px 8px rgba(37,99,235,0.12), inset 2px 2px 1px -1px rgba(37,99,235,0.6), inset -2px -2px 1px -1px rgba(79,70,229,0.55), inset 1px 1px 1px -0.5px rgba(6,182,212,0.5), inset -1px -1px 1px -0.5px rgba(139,92,246,0.4), inset 0 0 8px 4px rgba(37,99,235,0.08), 0 0 20px rgba(37,99,235,0.18)"
            : "0 0 4px rgba(37,99,235,0.04), 0 1px 4px rgba(37,99,235,0.08), inset 2px 2px 0.5px -2px rgba(37,99,235,0.5), inset -2px -2px 0.5px -2px rgba(79,70,229,0.45), inset 1px 1px 1px -0.5px rgba(37,99,235,0.35), inset -1px -1px 1px -0.5px rgba(6,182,212,0.35), inset 0 0 4px 3px rgba(37,99,235,0.06), 0 0 10px rgba(37,99,235,0.08)",
        }}
      />

      {/* Hover tint — full tier uses mix-blend + cursor-driven cone; lite uses simple gradient (no backdrop-blur). */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] rounded-full transition-opacity duration-200 ease-out"
        style={{
          opacity: isHovered ? 1 : 0,
          background: liquidGradient,
          mixBlendMode: tier === "lite" ? "normal" : "overlay",
        }}
      />

      {/* Child content (button or link) */}
      <div className="relative z-10 flex h-full w-full items-center justify-center gap-2">
        {children}
      </div>
    </div>
  )
}

export { Button, buttonVariants }
