import type { QuestPromptHighlightKind } from "@/features/quest/ui/quest-prompt-highlight-pure";
import { cn } from "@/shared/core/utils";

export function questPromptHighlightClass(
  kind: Exclude<QuestPromptHighlightKind, "plain">,
  variant: "light" | "dark",
): string {
  if (variant === "dark") {
    switch (kind) {
      case "number":
        return "rounded-sm bg-amber-400/25 px-0.5 font-semibold text-amber-100";
      case "unit":
        return "rounded-sm bg-violet-400/25 px-0.5 font-semibold text-violet-200";
      case "keyword":
        return "rounded-sm bg-[#6366F1]/30 px-0.5 font-semibold text-indigo-100";
    }
  }

  switch (kind) {
    case "number":
      return "rounded-sm bg-amber-100 px-0.5 font-semibold text-amber-900";
    case "unit":
      return "rounded-sm bg-violet-100 px-0.5 font-semibold text-[#5B21B6]";
    case "keyword":
      return "rounded-sm bg-[#EDE9FE] px-0.5 font-semibold text-[#5B21B6]";
  }
}

export function questPromptHighlightSpanClass(
  kind: QuestPromptHighlightKind,
  variant: "light" | "dark",
): string | undefined {
  if (kind === "plain") return undefined;
  return cn("whitespace-pre-wrap", questPromptHighlightClass(kind, variant));
}
