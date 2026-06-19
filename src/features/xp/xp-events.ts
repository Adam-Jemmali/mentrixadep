/**
 * Client-side XP award event system.
 * Allows components to emit XP award events that trigger animations.
 */

export interface XpAwardEvent {
  amount: number;
  /** Optional source element to animate from */
  sourceElement?: HTMLElement;
  /** Optional position to animate from (falls back to sourceElement if not provided) */
  position?: { x: number; y: number };
  /** Total XP after award */
  totalXp?: number;
  /** Optional retention hint shown after reward animation */
  nextObjective?: string;
  /** Optional semantic trigger for UI loop states */
  trigger?: "quest" | "duel" | "streak" | "session" | "generic";
  /** Optional headline under the XP amount */
  message?: string;
}

export function xpRewardMessage(event: Pick<XpAwardEvent, "message" | "trigger">): string {
  if (event.message) return event.message;
  switch (event.trigger) {
    case "quest":
      return "Quest complete!";
    case "duel":
      return "Duel reward unlocked!";
    case "streak":
      return "Streak bonus!";
    case "session":
      return "Session reward!";
    default:
      return "XP earned!";
  }
}

type XpAwardListener = (event: XpAwardEvent) => void;

const listeners: Set<XpAwardListener> = new Set();

export function emitXpAward(event: XpAwardEvent) {
  if (typeof window === "undefined") return;
  listeners.forEach((listener) => listener(event));
}

export function onXpAward(listener: XpAwardListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
