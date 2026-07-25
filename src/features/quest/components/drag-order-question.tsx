"use client";

import { useState } from "react";
import { Reorder } from "framer-motion";
import { GripVertical } from "lucide-react";
import { PromptWithMath } from "@/features/quest/ui/prompt-with-math";
import { QUEST_RUN_SURFACE, type QuestSurface } from "@/features/quest/ui/quest-surface";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/core/utils";

export function DragOrderQuestion({
  prompt,
  items,
  busy,
  disabled,
  onSubmit,
  surface = QUEST_RUN_SURFACE,
}: {
  prompt: string;
  items: string[];
  busy?: boolean;
  disabled?: boolean;
  onSubmit: (ordered: string[]) => void | Promise<void>;
  surface?: QuestSurface;
}) {
  const [order, setOrder] = useState(items);
  const isDark = surface === "dark";

  return (
    <div className="space-y-4">
      <div className={cn("text-[17px] leading-[1.6]", isDark ? "text-white" : "text-[var(--mx-navy)]")}>
        <PromptWithMath text={prompt} variant={surface} highlightKeyTerms />
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--mx-indigo)]">
        Drag to rank
      </p>
      <Reorder.Group
        axis="y"
        values={order}
        onReorder={setOrder}
        className="space-y-2"
        as="ul"
      >
        {order.map((item) => (
          <Reorder.Item
            key={item}
            value={item}
            drag={!disabled && !busy}
            className={cn(
              "flex list-none items-center gap-2 rounded-xl border px-3 py-3 text-sm shadow-[1px_2px_0_rgba(11,18,32,0.08)]",
              isDark
                ? "border-white/15 bg-[var(--mx-navy-2)] text-white"
                : "border-violet-300 bg-white text-[var(--mx-navy)]",
              (disabled || busy) && "opacity-70",
            )}
          >
            <GripVertical className="size-4 shrink-0 text-[var(--mx-indigo)]" aria-hidden />
            <span className="[&_.katex]:text-inherit">
              <PromptWithMath text={item} variant={surface} highlightKeyTerms />
            </span>
          </Reorder.Item>
        ))}
      </Reorder.Group>
      <Button
        type="button"
        disabled={busy || disabled}
        onClick={() => void onSubmit(order)}
      >
        Lock this order
      </Button>
    </div>
  );
}
