"use client";

import { useCallback, useRef, useState } from "react";
import { motion, type PanInfo } from "framer-motion";
import { cn } from "@/shared/core/utils";

type SkillDuelChoiceBoardProps = {
  choices: string[];
  onSelect: (index: number) => void;
  disabled?: boolean;
  selectedIndex?: number | null;
  /** When true, choices lock after the first pick (live timed duels). */
  lockOnSelect?: boolean;
};

function isInRect(x: number, y: number, rect: DOMRect) {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function displayChoice(text: string, _index: number, choiceCount: number): string {
  if (choiceCount === 2 && (text === "True" || text === "False")) {
    return text;
  }
  return text;
}

export function SkillDuelChoiceBoard({
  choices,
  onSelect,
  disabled = false,
  selectedIndex = null,
  lockOnSelect = true,
}: SkillDuelChoiceBoardProps) {
  const dropRef = useRef<HTMLDivElement>(null);
  const [hoverDrop, setHoverDrop] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const locked = disabled || (lockOnSelect && selectedIndex != null);

  const commitChoice = useCallback(
    (index: number) => {
      if (locked) return;
      onSelect(index);
    },
    [locked, onSelect],
  );

  const handleDrag = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (locked) return;
      const rect = dropRef.current?.getBoundingClientRect();
      if (!rect) {
        setHoverDrop(false);
        return;
      }
      setHoverDrop(isInRect(info.point.x, info.point.y, rect));
    },
    [locked],
  );

  const handleDragEnd = useCallback(
    (index: number, _event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setDraggingIndex(null);
      setHoverDrop(false);
      if (locked) return;
      const rect = dropRef.current?.getBoundingClientRect();
      if (!rect) return;
      if (isInRect(info.point.x, info.point.y, rect)) {
        commitChoice(index);
      }
    },
    [commitChoice, locked],
  );

  const droppedLabel =
    selectedIndex != null && selectedIndex >= 0 && selectedIndex < choices.length
      ? displayChoice(choices[selectedIndex]!, selectedIndex, choices.length)
      : null;

  const isTrueFalse = choices.length === 2 && choices.every((c) => c === "True" || c === "False");

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium text-slate-500">
        Drag an answer into the slot below, or tap a card to lock it in.
      </p>

      <div
        ref={dropRef}
        className={cn(
          "min-h-[4.5rem] rounded-xl border-2 border-dashed px-4 py-3 transition-colors",
          hoverDrop && !locked
            ? "border-blue-400 bg-blue-50/70"
            : droppedLabel
              ? "border-blue-300 bg-blue-50/50"
              : "border-slate-200 bg-slate-50/80",
        )}
        aria-label="Answer drop zone"
      >
        {droppedLabel ? (
          <p className="text-sm font-semibold leading-snug text-slate-900">{droppedLabel}</p>
        ) : (
          <p className="text-sm font-medium text-slate-400">Drop your answer here</p>
        )}
      </div>

      <div
        className={cn(
          "grid gap-3",
          isTrueFalse ? "grid-cols-2" : "sm:grid-cols-2",
        )}
      >
        {choices.map((choice, index) => {
          const isSelected = selectedIndex === index;
          const isDragging = draggingIndex === index;

          return (
            <motion.div
              key={`${index}-${choice.slice(0, 24)}`}
              drag={!locked}
              dragSnapToOrigin
              dragElastic={0.12}
              dragMomentum={false}
              whileDrag={{ scale: 1.03, zIndex: 20, boxShadow: "0 14px 36px rgba(15,23,42,0.18)" }}
              onDragStart={() => setDraggingIndex(index)}
              onDrag={handleDrag}
              onDragEnd={(e, info) => handleDragEnd(index, e, info)}
              onClick={() => commitChoice(index)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  commitChoice(index);
                }
              }}
              role="button"
              tabIndex={locked ? -1 : 0}
              aria-disabled={locked}
              className={cn(
                "flex cursor-grab items-start gap-3 rounded-xl border-2 bg-white px-4 py-3 text-left text-sm font-medium text-slate-900 transition-colors active:cursor-grabbing",
                isSelected
                  ? "border-blue-400 bg-blue-50/60"
                  : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/40",
                locked && "pointer-events-none opacity-60",
                isDragging && "border-blue-400",
              )}
            >
              <span
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-bold text-slate-500"
                aria-hidden
              >
                ⋮⋮
              </span>
              <span className="leading-snug">{displayChoice(choice, index, choices.length)}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
