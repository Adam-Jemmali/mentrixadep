"use client";

import { QuestPromptTable } from "@/features/quest/ui/quest-prompt-table";
import { QuestFunctionGraph } from "@/features/quest/components/quest-function-graph";
import {
  hasQuestStimulus,
  type QuestStimulus,
} from "@/features/quest/quest-stimulus-pure";
import { cn } from "@/shared/core/utils";

export function QuestStimulusBlock({
  stimulus,
  variant = "light",
  className,
}: {
  stimulus?: QuestStimulus[] | null;
  variant?: "light" | "dark";
  className?: string;
}) {
  if (!hasQuestStimulus(stimulus)) return null;
  const isDark = variant === "dark";

  return (
    <div className={cn("space-y-3", className)}>
      {stimulus!.map((block, index) => {
        if (block.kind === "table") {
          return (
            <div key={`stimulus-table-${index}`} className="space-y-1.5">
              {block.title ? (
                <p
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-[0.14em]",
                    isDark ? "text-[#A5B4FC]" : "text-[var(--mx-indigo)]",
                  )}
                >
                  {block.title}
                </p>
              ) : null}
              <QuestPromptTable
                headers={block.headers}
                rows={block.rows}
                variant={variant}
                highlightKeyTerms
              />
            </div>
          );
        }

        return (
          <QuestFunctionGraph
            key={`stimulus-graph-${index}`}
            graph={block}
            variant={variant}
          />
        );
      })}
    </div>
  );
}
