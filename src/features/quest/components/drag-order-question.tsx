"use client";

import { useState } from "react";
import { Reorder } from "framer-motion";
import { GripVertical } from "lucide-react";
import { PromptWithMath } from "@/features/quest/ui/prompt-with-math";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/core/utils";

export function DragOrderQuestion({
  prompt,
  items,
  busy,
  disabled,
  onSubmit,
}: {
  prompt: string;
  items: string[];
  busy?: boolean;
  disabled?: boolean;
  onSubmit: (ordered: string[]) => void | Promise<void>;
}) {
  const [order, setOrder] = useState(items);

  return (
    <div className="space-y-4">
      <PromptWithMath text={prompt} variant="light" highlightKeyTerms />
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6366F1]">
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
              "flex list-none items-center gap-2 rounded-xl border border-[#A5B4FC] bg-white px-3 py-3 text-sm text-[#0B1220] shadow-[1px_2px_0_rgba(11,18,32,0.08)]",
              (disabled || busy) && "opacity-70",
            )}
          >
            <GripVertical className="size-4 shrink-0 text-[#6366F1]" aria-hidden />
            <span className="[&_.katex]:text-inherit">
              <PromptWithMath text={item} variant="light" highlightKeyTerms />
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
