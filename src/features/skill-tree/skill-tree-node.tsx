"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { skillTreeLabel } from "@/features/skill-tree/skill-tree-copy-pure";
import {
  canRenderUnlockBloom,
  canStartUnlockBloom,
} from "@/features/skill-tree/skill-tree-motion-pure";
import type {
  SkillTreeLabelKind,
  SkillTreeNode as SkillTreeNodeData,
} from "@/features/skill-tree/types";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { cn } from "@/shared/core/utils";

function nodeLabelKind(
  node: SkillTreeNodeData,
  isFocus: boolean,
  reviewDue: boolean,
): SkillTreeLabelKind {
  if (!node.unlocked) return "locked";
  if (reviewDue) return "review";
  if (isFocus) return "next";
  if (node.state === "proficient") return "solid";
  if (node.state === "weak") return "weak";
  return "open";
}

export function SkillTreeNode({
  node,
  isFocus = false,
  href,
  compact = false,
}: {
  node: SkillTreeNodeData;
  isFocus?: boolean;
  href?: string;
  compact?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const previousUnlocked = useRef(node.unlocked);
  const [bloom, setBloom] = useState(false);
  const reviewDue =
    node.nextReviewAt != null && Date.parse(node.nextReviewAt) <= Date.now();
  const kind = nodeLabelKind(node, isFocus, reviewDue);
  const label = skillTreeLabel(kind);
  const verified = node.state === "verified";
  const interactive = node.unlocked && href != null;
  const bloomActive = canRenderUnlockBloom(bloom, Boolean(reducedMotion));

  useEffect(() => {
    const wasUnlocked = previousUnlocked.current;
    previousUnlocked.current = node.unlocked;

    if (reducedMotion) {
      setBloom(false);
      return undefined;
    }

    if (canStartUnlockBloom(wasUnlocked, node.unlocked, Boolean(reducedMotion))) {
      setBloom(true);
      const timeout = window.setTimeout(() => setBloom(false), 900);
      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, [node.unlocked, reducedMotion]);

  const content = (
    <>
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center rounded-xl border p-2",
          verified
            ? "border-[#D4A017]/70 bg-[#D4A017]/10"
            : node.unlocked
              ? "border-[#818CF8]/50 bg-[#312E81]/55"
              : "border-white/10 bg-white/5",
        )}
      >
        <MentrixaVocabIcon
          name={verified ? "verified" : label.icon}
          size={compact ? 28 : isFocus ? 40 : 34}
          surface="dark"
          gold={verified}
          title={verified ? "Verified" : label.text}
        />
      </span>
      <span className="min-w-0 flex-1 text-left">
        {!verified ? (
          <span
            className={cn(
              "block text-[9px] font-black uppercase tracking-[0.16em]",
              node.unlocked ? "text-violet-200" : "text-slate-500",
            )}
          >
            {label.text}
          </span>
        ) : (
          <span className="sr-only">Verified</span>
        )}
        <span
          className={cn(
            "mt-0.5 block truncate font-semibold leading-tight",
            compact ? "text-xs" : isFocus ? "text-sm sm:text-base" : "text-xs",
            node.unlocked ? "text-white" : "text-slate-400",
          )}
          title={node.nodeName}
        >
          {node.nodeName}
        </span>
      </span>
    </>
  );

  return (
    <motion.div
      className={cn(
        "relative",
        isFocus && !reducedMotion && "drop-shadow-[0_0_18px_rgba(124,58,237,0.5)]",
      )}
      initial={false}
      animate={
        bloomActive
          ? { scale: [1, 1.12, 1], opacity: [1, 1, 1] }
          : isFocus && !reducedMotion
            ? { scale: [1, 1.025, 1] }
            : { scale: 1 }
      }
      transition={
        bloomActive
          ? { duration: 0.8, ease: "easeOut" }
          : isFocus && !reducedMotion
            ? { duration: 2.1, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
            : { duration: 0 }
      }
    >
      {bloomActive ? (
        <motion.span
          className="pointer-events-none absolute -inset-3 rounded-2xl border-2 border-[#6366F1]"
          initial={{ opacity: 0.85, scale: 0.84 }}
          animate={{ opacity: 0, scale: 1.15 }}
          transition={{ duration: 0.8 }}
          aria-hidden
        />
      ) : null}
      {interactive ? (
        <Link
          href={href}
          className={cn(
            "flex w-full cursor-pointer items-center gap-3 rounded-2xl border bg-[#111C32]/95 text-left shadow-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A5B4FC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1220]",
            compact ? "min-h-16 p-2.5" : isFocus ? "min-h-24 p-4" : "min-h-20 p-3",
            verified
              ? "border-[#D4A017]/70 hover:bg-[#17233B]"
              : "border-[#6366F1]/70 hover:border-[#A5B4FC] hover:bg-[#17233B]",
          )}
          aria-label={`${label.text}: ${node.nodeName}`}
        >
          {content}
        </Link>
      ) : (
        <div
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl border bg-[#0F172A]/90 text-left",
            compact ? "min-h-16 p-2.5" : isFocus ? "min-h-24 p-4" : "min-h-20 p-3",
            node.unlocked
              ? "border-[#6366F1]/60"
              : "border-white/10 opacity-75",
          )}
          aria-label={`${label.text}: ${node.nodeName}`}
        >
          {content}
        </div>
      )}
    </motion.div>
  );
}
