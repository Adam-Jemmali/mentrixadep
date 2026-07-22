"use client";

import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { animate } from "@/shared/animation/anime";
import { motion, useReducedMotion } from "@/shared/animation/motion";
import { cn } from "@/shared/core/utils";
import { MentrixaTooltip } from "@/shared/ui/tooltip-patterns";

export type MasteryNodeVisualState =
  | "unstarted"
  | "attempted"
  | "practiced"
  | "proficient"
  | "verified";

export type MasteryNodeSize = "xs" | "sm" | "md" | "lg";

export type MasteryNodeProps = {
  nodeId: string;
  state: MasteryNodeVisualState;
  nodeName: string;
  accuracy?: number;
  size: MasteryNodeSize;
  showLabel?: boolean;
  /** Verified state only. Defaults to true when verified. */
  showGlow?: boolean;
  /** Use in-scene CSS tooltip (passport 3D Html — portal tooltips misalign under transform). */
  localTooltip?: boolean;
  onPress?: () => void;
};

const NODE_SIZE_PX: Record<MasteryNodeSize, number> = {
  xs: 20,
  sm: 28,
  md: 36,
  lg: 48,
};

const LABEL_FONT_PX: Record<Exclude<MasteryNodeSize, "xs">, number> = {
  sm: 10,
  md: 11,
  lg: 12,
};

const STATE_BG: Record<MasteryNodeVisualState, string> = {
  unstarted: "var(--mx-node-unstarted)",
  attempted: "var(--mx-node-attempted)",
  practiced: "var(--mx-node-practiced)",
  proficient: "var(--mx-node-proficient)",
  verified: "var(--mx-node-verified)",
};

function formatMasteryNodeTooltip(nodeName: string, accuracy?: number): string {
  if (accuracy == null) return nodeName;
  return `${nodeName}: ${Math.round(accuracy)}%`;
}

function nodeSurfaceStyle(state: MasteryNodeVisualState, px: number): CSSProperties {
  const base: CSSProperties = {
    width: px,
    height: px,
    borderRadius: "var(--radius-node)",
    backgroundColor: STATE_BG[state],
  };

  if (state !== "verified") return base;

  return {
    ...base,
    border: "1px solid rgba(255, 255, 255, 0.14)",
    backgroundImage:
      "linear-gradient(145deg, rgba(255, 255, 255, 0.24) 0%, rgba(255, 255, 255, 0.04) 48%, transparent 72%)",
    boxShadow: "0 0 12px 2px var(--mx-node-verified-glow)",
  };
}

function wrapWithTooltip(
  node: ReactNode,
  enabled: boolean,
  nodeName: string,
  accuracy: number | undefined,
  local = false,
) {
  if (!enabled) return node;

  if (local) {
    const text = formatMasteryNodeTooltip(nodeName, accuracy);
    return (
      <span className="group relative inline-flex">
        {node}
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-[calc(100%+5px)] left-1/2 z-[60] -translate-x-1/2 whitespace-nowrap rounded border border-white/10 bg-[#0F172A] px-2 py-1 text-[10px] leading-snug text-slate-100 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
        >
          {text}
        </span>
      </span>
    );
  }

  return (
    <MentrixaTooltip
      tone="dark"
      placement="top"
      content={
        <p className="max-w-[14rem] leading-snug">{formatMasteryNodeTooltip(nodeName, accuracy)}</p>
      }
      triggerClassName="inline-flex flex-col items-center"
    >
      {node}
    </MentrixaTooltip>
  );
}

export function MasteryNode({
  nodeId,
  state,
  nodeName,
  accuracy,
  size,
  showLabel = false,
  showGlow,
  localTooltip = false,
  onPress,
}: MasteryNodeProps) {
  const reduceMotion = useReducedMotion();
  const nodeRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLSpanElement>(null);
  const prevStateRef = useRef(state);
  const px = NODE_SIZE_PX[size];
  const isVerified = state === "verified";
  const glowEnabled = isVerified && showGlow !== false;
  const isPressable = typeof onPress === "function";
  const tooltipEnabled = (size === "xs" || size === "sm") && typeof onPress !== "function";

  useEffect(() => {
    if (prevStateRef.current === state) return;

    if (!reduceMotion && nodeRef.current) {
      animate(nodeRef.current, {
        scale: [1, 1.35, 1],
        duration: 520,
        ease: "outElastic(1, .6)",
      });
    }

    if (!reduceMotion && state === "verified" && glowEnabled && glowRef.current) {
      glowRef.current.style.opacity = "0";
      animate(glowRef.current, {
        opacity: [0, 1],
        duration: 800,
        ease: "outQuart",
      });
    }

    prevStateRef.current = state;
  }, [state, glowEnabled, reduceMotion]);

  const motionProps = {
    ref: nodeRef,
    "data-node-id": nodeId,
    "data-node-state": state,
    "aria-label": formatMasteryNodeTooltip(nodeName, accuracy),
    className: cn(
      "relative shrink-0",
      isPressable && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mx-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mx-surface)]",
    ),
    style: nodeSurfaceStyle(state, px),
    whileHover: reduceMotion || !isPressable ? undefined : { scale: 1.12 },
    whileTap: reduceMotion || !isPressable ? undefined : { scale: 0.92 },
    transition: { type: "spring" as const, stiffness: 400 },
    onClick: isPressable ? onPress : undefined,
    onKeyDown: isPressable
      ? (event: KeyboardEvent) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onPress?.();
          }
        }
      : undefined,
    role: isPressable ? "button" : undefined,
    tabIndex: isPressable ? 0 : undefined,
  };

  const nodeSquare = <motion.div {...motionProps} />;

  const body = (
    <span className="relative inline-flex flex-col items-center">
      {glowEnabled ? (
        <span
          ref={glowRef}
          aria-hidden
          className="pointer-events-none absolute rounded-[var(--radius-node)]"
          style={{
            width: px,
            height: px,
            boxShadow: "0 0 12px 2px var(--mx-node-verified-glow)",
            opacity: prevStateRef.current === state && isVerified ? 1 : 0,
          }}
        />
      ) : null}

      {nodeSquare}

      {size === "lg" && accuracy != null ? (
        <span
          className="absolute -right-1 -top-1 min-w-[1.125rem] rounded-[var(--radius-pill)] border border-white/10 bg-[var(--mx-surface-3)] px-1 text-center text-[9px] font-bold tabular-nums leading-4 text-white"
          aria-hidden
        >
          {Math.round(accuracy)}
        </span>
      ) : null}

      {showLabel && size !== "xs" ? (
        <span
          className="mt-1 max-w-[6.5rem] truncate text-center font-medium text-[var(--mx-muted)]"
          style={{ fontSize: LABEL_FONT_PX[size] }}
        >
          {nodeName}
        </span>
      ) : null}
    </span>
  );

  return wrapWithTooltip(body, tooltipEnabled, nodeName, accuracy, localTooltip);
}
