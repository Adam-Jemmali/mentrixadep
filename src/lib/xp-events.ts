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
