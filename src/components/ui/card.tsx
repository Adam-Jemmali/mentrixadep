"use client";

import * as React from "react";
import { useRef, useState, useCallback } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";

import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────
 * Mentrixa 3D Card System
 *
 * Every Card and ScrollRevealCard renders with:
 * 1) Scroll-reveal: 3D perspective tilt on scroll-into-view
 * 2) Hover tilt: cursor-tracking 3D tilt + spotlight
 *
 * The hover tilt uses the "evade" direction by default
 * (card tilts away from cursor) with a soft spotlight.
 * ──────────────────────────────────────────────────────── */

/* ── Hover tilt hook (extracted from TiltCard) ── */

function useTiltHover({
  tiltLimit = 8,
  hoverScale = 1.02,
  perspective = 1200,
  effect = "evade" as "gravitate" | "evade",
  spotlight = true,
} = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tiltTransform, setTiltTransform] = useState(
    `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`,
  );
  const [spotlightPos, setSpotlightPos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const dir = effect === "evade" ? -1 : 1;

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const xRot = (py - 0.5) * (tiltLimit * 2) * dir;
      const yRot = (px - 0.5) * -(tiltLimit * 2) * dir;
      setTiltTransform(
        `perspective(${perspective}px) rotateX(${xRot}deg) rotateY(${yRot}deg) scale3d(${hoverScale}, ${hoverScale}, ${hoverScale})`,
      );
      if (spotlight) {
        setSpotlightPos({ x: px * 100, y: py * 100 });
      }
    },
    [tiltLimit, hoverScale, perspective, dir, spotlight],
  );

  const onPointerEnter = useCallback(() => setIsHovered(true), []);

  const onPointerLeave = useCallback(() => {
    setTiltTransform(
      `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`,
    );
    setIsHovered(false);
  }, [perspective]);

  return {
    ref,
    tiltTransform,
    spotlightPos,
    isHovered,
    onPointerMove,
    onPointerEnter,
    onPointerLeave,
    spotlight,
  };
}

/* ── Spotlight overlay rendered inside tilted cards ── */

function SpotlightOverlay({
  isHovered,
  spotlightPos,
}: {
  isHovered: boolean;
  spotlightPos: { x: number; y: number };
}) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-[inherit]"
      style={{ opacity: isHovered ? 1 : 0, transition: "opacity 0.3s" }}
    >
      <div
        className="absolute w-[200%] h-[200%] rounded-full"
        style={{
          left: `${spotlightPos.x}%`,
          top: `${spotlightPos.y}%`,
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(circle, rgba(37,99,235,0.08) 0%, rgba(79,70,229,0.04) 20%, transparent 45%)",
        }}
      />
    </div>
  );
}

/* ── Card (primary component — scroll-reveal + tilt) ── */

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <ScrollRevealCard ref={ref} className={className} {...props}>
        {children}
      </ScrollRevealCard>
    );
  },
);
Card.displayName = "Card";

/* ── ScrollRevealCard — scroll animation + hover tilt ── */

const ScrollRevealCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, style, ...props }, forwardedRef) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const isInView = useInView(containerRef, { once: false, amount: 0.15 });

    const { scrollYProgress } = useScroll({
      target: containerRef,
      offset: ["start end", "end start"],
    });

    /* Scroll animations */
    const rotateX = useTransform(scrollYProgress, [0, 0.3, 0.5], [6, 1, 0]);
    const translateY = useTransform(scrollYProgress, [0, 0.3, 0.5], [40, 8, 0]);
    const scale = useTransform(scrollYProgress, [0, 0.3, 0.5], [0.97, 0.995, 1]);

    /* Hover tilt */
    const tilt = useTiltHover({ tiltLimit: 8, hoverScale: 1.02 });

    /* Merge forwarded ref + internal ref */
    const mergedRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        if (typeof forwardedRef === "function") {
          forwardedRef(node);
        } else if (forwardedRef) {
          (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
      },
      [forwardedRef],
    );

    return (
      <div ref={mergedRef} style={{ perspective: "1200px", position: "relative" }}>
        <motion.div
          style={{
            rotateX,
            translateY,
            scale,
            transformOrigin: "center bottom",
            opacity: isInView ? 1 : 0.4,
            transition: "opacity 0.4s ease-out",
          }}
        >
          <div
            ref={tilt.ref}
            onPointerEnter={tilt.onPointerEnter}
            onPointerMove={tilt.onPointerMove}
            onPointerLeave={tilt.onPointerLeave}
            className={cn(
              "will-change-transform relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm",
              className,
            )}
            style={{
              transform: tilt.tiltTransform,
              transition: "transform 0.2s ease-out",
              transformStyle: "preserve-3d",
              ...style,
            }}
            {...(props as React.HTMLAttributes<HTMLDivElement>)}
          >
            {children}
            <SpotlightOverlay
              isHovered={tilt.isHovered}
              spotlightPos={tilt.spotlightPos}
            />
          </div>
        </motion.div>
      </div>
    );
  },
);
ScrollRevealCard.displayName = "ScrollRevealCard";

/* ── Sub-components (unchanged API) ── */

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-2xl font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, ScrollRevealCard };
