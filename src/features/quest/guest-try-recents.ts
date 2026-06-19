import { XP } from "@/features/xp/xp-constants";

const STORAGE_KEY = "mentrixa_guest_try_recents";
const MAX_RECENTS = 5;

export type GuestTryRecentEntry = {
  id: string;
  subject: string;
  correct: number;
  total: number;
  accuracy: number;
  wouldXp: number;
  completedAt: string;
};

export function computeGuestTryWouldXp(correct: number, total: number): number {
  return XP.QUEST_COMPLETE + (total > 0 && correct === total ? XP.QUEST_PERFECT_BONUS : 0);
}

export function loadGuestTryRecents(): GuestTryRecentEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is GuestTryRecentEntry =>
          !!x &&
          typeof x === "object" &&
          typeof (x as GuestTryRecentEntry).subject === "string" &&
          typeof (x as GuestTryRecentEntry).correct === "number" &&
          typeof (x as GuestTryRecentEntry).total === "number",
      )
      .slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

export function saveGuestTryRecent(entry: {
  subject: string;
  correct: number;
  total: number;
}): GuestTryRecentEntry {
  const accuracy = entry.total > 0 ? Math.round((entry.correct / entry.total) * 100) : 0;
  const wouldXp = computeGuestTryWouldXp(entry.correct, entry.total);
  const row: GuestTryRecentEntry = {
    id: `guest-${Date.now()}`,
    subject: entry.subject.trim().slice(0, 120) || "General",
    correct: entry.correct,
    total: entry.total,
    accuracy,
    wouldXp,
    completedAt: new Date().toISOString(),
  };
  if (typeof window === "undefined") return row;
  const prev = loadGuestTryRecents().filter((r) => r.subject !== row.subject || r.accuracy !== row.accuracy);
  const next = [row, ...prev].slice(0, MAX_RECENTS);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return row;
}
