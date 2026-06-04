/**
 * Single shared duel loop player — one DOM <audio>, bound from StudentNavbar.
 * Keeps play() in the same user-gesture stack as nav / queue clicks.
 */

export const DUEL_SOUND_SRC = "/images/duel_sound.mp3";

/** ~28% — arena bed sits under UI without overpowering (~−11 dB vs max). */
const ARENA_LOOP_VOLUME = 0.28;
export const DUEL_LOOP_VOLUME = ARENA_LOOP_VOLUME;
const MUTE_KEY = "mentrixa-sounds-muted";

let duelEl: HTMLAudioElement | null = null;
let loopWanted = false;

export function isArenaPath(pathname: string): boolean {
  return pathname.startsWith("/student/clan") || pathname.startsWith("/student/duel");
}

function isMuted(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(MUTE_KEY) === "1";
}

/** Bind the navbar-mounted `<audio loop>` element (call once on mount). */
export function bindDuelAudioElement(el: HTMLAudioElement | null): void {
  if (!el) return;
  duelEl = el;
  el.src = DUEL_SOUND_SRC;
  el.loop = true;
  el.preload = "auto";
  el.volume = ARENA_LOOP_VOLUME;
  el.setAttribute("playsinline", "true");

  const retryIfWanted = () => {
    if (loopWanted) void tryPlayLoop();
  };
  el.addEventListener("canplay", retryIfWanted);
  el.addEventListener("canplaythrough", retryIfWanted);
  el.load();
}

export function preloadDuelSound(): void {
  if (duelEl && duelEl.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    duelEl.load();
  }
}

async function tryPlayLoop(): Promise<boolean> {
  if (!duelEl || !loopWanted || isMuted()) return false;

  duelEl.loop = true;
  duelEl.volume = ARENA_LOOP_VOLUME;
  duelEl.muted = false;

  try {
    await duelEl.play();
    return true;
  } catch {
    try {
      duelEl.muted = true;
      duelEl.volume = 0;
      await duelEl.play();
      duelEl.pause();
      duelEl.currentTime = 0;
      duelEl.muted = false;
      duelEl.volume = ARENA_LOOP_VOLUME;
      await duelEl.play();
      return true;
    } catch {
      return false;
    }
  }
}

/** Call synchronously from pointerdown / click (Clan, Duels, Start Duel). */
export function startDuelLoopFromGesture(): void {
  if (typeof window === "undefined" || isMuted()) return;
  loopWanted = true;
  preloadDuelSound();
  void tryPlayLoop();
}

/** Route entered clan/duel or queue opened — keep loop running. */
export function ensureDuelLoopPlaying(): void {
  if (typeof window === "undefined" || isMuted()) return;
  loopWanted = true;
  preloadDuelSound();
  if (duelEl?.paused) void tryPlayLoop();
}

export function enterDuelQueueMusic(): void {
  startDuelLoopFromGesture();
}

export function stopDuelLoop(): void {
  loopWanted = false;
  if (!duelEl) return;
  duelEl.pause();
  duelEl.currentTime = 0;
}

export function setArenaRouteActive(active: boolean): void {
  if (active) ensureDuelLoopPlaying();
  else stopDuelLoop();
}

export function isDuelLoopAudible(): boolean {
  return Boolean(duelEl && loopWanted && !duelEl.paused);
}
