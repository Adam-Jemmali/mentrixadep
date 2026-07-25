/** Quest run uses one surface — dark navy — so text/background contrast stays consistent. */
export type QuestSurface = "light" | "dark";

export const QUEST_RUN_SURFACE: QuestSurface = "dark";

export function questMutedTextClass(surface: QuestSurface): string {
  return surface === "dark" ? "text-white/70" : "text-slate-600";
}

export function questSubtleTextClass(surface: QuestSurface): string {
  return surface === "dark" ? "text-white/55" : "text-slate-500";
}
