/** Brand UI sounds — MP4 (AAC) for UI cues; duel MP3 via duel-audio-controller. */

import {
  DUEL_SOUND_SRC,
  ensureDuelLoopPlaying,
  enterDuelQueueMusic,
  preloadDuelSound,
  setArenaRouteActive,
  startDuelLoopFromGesture,
  stopDuelLoop,
} from "@/features/duels/duel-audio-controller";

const SOUND_ASSET_VERSION = "arena-navbar-audio-1";

export const MENTRIXA_SOUND_SRC = {
  loading: `/images/mentrixa-loading.mp4?v=${SOUND_ASSET_VERSION}`,
  rankUp: `/images/mentrixa-rank-up.mp4?v=${SOUND_ASSET_VERSION}`,
  duel: DUEL_SOUND_SRC,
} as const;

const AUDIO_UNLOCKED_EVENT = "mentrixa-audio-unlocked";

export type MentrixaSoundKey = keyof typeof MENTRIXA_SOUND_SRC;

export const MENTRIXA_LOADING_DURATION_MS = 5000;

const MUTE_KEY = "mentrixa-sounds-muted";
const MUTE_CHANGED_EVENT = "mentrixa-sounds-mute-changed";

const DEFAULT_VOLUME: Record<MentrixaSoundKey, number> = {
  loading: 0.4,
  rankUp: 0.55,
  duel: 0.28,
};

function htmlCacheKey(key: MentrixaSoundKey, loop: boolean): string {
  return loop ? `${key}:loop` : `${key}:once`;
}

const htmlAudioCache = new Map<string, HTMLAudioElement>();
let unlockListenersAttached = false;
const pendingPlays: Array<{ key: MentrixaSoundKey; options?: PlayMentrixaSoundOptions }> = [];
let loadingStopTimer: ReturnType<typeof setTimeout> | null = null;
let loadingOnceSession = 0;

const UI_SOUND_PRIME_TARGETS: Array<{ key: MentrixaSoundKey; loop: boolean }> = [
  { key: "loading", loop: false },
  { key: "rankUp", loop: false },
];

export type PlayMentrixaSoundOptions = {
  volume?: number;
  loop?: boolean;
};

function prefersReducedFeedback(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isMentrixaSoundMuted(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(MUTE_KEY) === "1";
}

export function setMentrixaSoundMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  if (muted) {
    localStorage.setItem(MUTE_KEY, "1");
    stopAllMentrixaSounds();
  } else {
    localStorage.removeItem(MUTE_KEY);
  }
  window.dispatchEvent(new CustomEvent(MUTE_CHANGED_EVENT, { detail: { muted } }));
}

export function onMentrixaSoundMuteChange(listener: (muted: boolean) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<{ muted: boolean }>).detail;
    listener(detail?.muted ?? isMentrixaSoundMuted());
  };
  window.addEventListener(MUTE_CHANGED_EVENT, handler);
  return () => window.removeEventListener(MUTE_CHANGED_EVENT, handler);
}

function shouldPlay(): boolean {
  return !prefersReducedFeedback() && !isMentrixaSoundMuted();
}

function dispatchAudioUnlocked(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUDIO_UNLOCKED_EVENT));
}

function createHtmlAudio(src: string): HTMLAudioElement {
  const el = new Audio(src);
  el.preload = "auto";
  el.setAttribute("playsinline", "true");
  return el;
}

function getHtmlAudio(key: MentrixaSoundKey, loop: boolean): HTMLAudioElement {
  const cacheKey = htmlCacheKey(key, loop);
  let el = htmlAudioCache.get(cacheKey);
  if (!el) {
    el = createHtmlAudio(MENTRIXA_SOUND_SRC[key]);
    htmlAudioCache.set(cacheKey, el);
  }
  return el;
}

export function warmMentrixaSoundAssets(): void {
  if (typeof window === "undefined") return;
  for (const { key, loop } of UI_SOUND_PRIME_TARGETS) {
    const el = getHtmlAudio(key, loop);
    if (el.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) el.load();
  }
  preloadDuelSound();
}

function flushPendingPlays(): void {
  if (!shouldPlay() || pendingPlays.length === 0) return;
  const queue = pendingPlays.splice(0, pendingPlays.length);
  for (const item of queue) {
    playMentrixaSound(item.key, item.options);
  }
}

function primeAudioElement(el: HTMLAudioElement, loop: boolean, onDone: () => void): void {
  const prevVolume = el.volume;
  const prevLoop = el.loop;
  el.muted = true;
  el.volume = 0;
  el.loop = loop;

  const finish = () => {
    el.pause();
    el.currentTime = 0;
    el.loop = prevLoop;
    el.muted = false;
    el.volume = prevVolume;
    onDone();
  };

  const attempt = el.play();
  if (attempt === undefined) {
    finish();
    return;
  }
  void attempt.then(finish).catch(finish);
}

function runUnlockPrime(): void {
  let remaining = UI_SOUND_PRIME_TARGETS.length;
  const done = () => {
    remaining -= 1;
    if (remaining > 0) return;
    flushPendingPlays();
    dispatchAudioUnlocked();
  };
  for (const { key, loop } of UI_SOUND_PRIME_TARGETS) {
    primeAudioElement(getHtmlAudio(key, loop), loop, done);
  }
}

export function unlockMentrixaAudioFromUserGesture(): void {
  if (typeof window === "undefined" || !shouldPlay()) return;
  warmMentrixaSoundAssets();
  runUnlockPrime();
}

export function ensureMentrixaAudioUnlocked(): void {
  if (typeof window === "undefined" || unlockListenersAttached) return;
  unlockListenersAttached = true;
  window.addEventListener("pointerdown", unlockMentrixaAudioFromUserGesture, { passive: true });
  window.addEventListener("touchstart", unlockMentrixaAudioFromUserGesture, { passive: true });
  window.addEventListener("keydown", unlockMentrixaAudioFromUserGesture, { passive: true });
}

function attemptPlayElement(el: HTMLAudioElement, onFail?: () => void): void {
  const attempt = el.play();
  if (attempt === undefined) return;
  void attempt.catch(() => onFail?.());
}

function startHtmlPlayback(key: MentrixaSoundKey, options: PlayMentrixaSoundOptions = {}): void {
  const loop = options.loop ?? false;
  const el = getHtmlAudio(key, loop);
  el.muted = false;
  el.volume = options.volume ?? DEFAULT_VOLUME[key];
  el.loop = loop;

  const run = () => {
    el.currentTime = 0;
    attemptPlayElement(el, () => pendingPlays.push({ key, options }));
  };

  if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    run();
    return;
  }

  const onReady = () => {
    el.removeEventListener("canplay", onReady);
    run();
  };
  el.addEventListener("canplay", onReady);
  if (el.networkState === HTMLMediaElement.NETWORK_EMPTY) el.load();
}

export function playMentrixaSound(
  key: MentrixaSoundKey,
  options: PlayMentrixaSoundOptions = {},
): void {
  if (typeof window === "undefined" || !shouldPlay()) return;
  if (key === "duel") {
    playDuelSoundLoop(options);
    return;
  }
  ensureMentrixaAudioUnlocked();
  startHtmlPlayback(key, options);
}

function stopHtmlAudioInstance(key: MentrixaSoundKey, loop: boolean): void {
  const el = htmlAudioCache.get(htmlCacheKey(key, loop));
  if (!el) return;
  el.pause();
  el.currentTime = 0;
  el.loop = false;
}

export function stopMentrixaSound(key: MentrixaSoundKey): void {
  if (key === "duel") {
    stopDuelSound();
    return;
  }
  stopHtmlAudioInstance(key, false);
  stopHtmlAudioInstance(key, true);
}

export function stopMentrixaLoadingSound(): void {
  if (loadingStopTimer) {
    clearTimeout(loadingStopTimer);
    loadingStopTimer = null;
  }
  loadingOnceSession += 1;
  stopHtmlAudioInstance("loading", false);
  stopHtmlAudioInstance("loading", true);
}

export function playMentrixaRankUpOnce(
  options: Pick<PlayMentrixaSoundOptions, "volume"> = {},
): void {
  playMentrixaSound("rankUp", { loop: false, volume: options.volume });
}

export function playMentrixaLoadingOnce(
  options: Pick<PlayMentrixaSoundOptions, "volume"> = {},
): void {
  if (typeof window === "undefined" || !shouldPlay()) return;
  warmMentrixaSoundAssets();
  stopDuelLoop();
  stopMentrixaLoadingSound();
  const session = loadingOnceSession;
  startHtmlPlayback("loading", { loop: false, volume: options.volume });
  loadingStopTimer = setTimeout(() => {
    if (loadingOnceSession !== session) return;
    stopHtmlAudioInstance("loading", false);
    loadingStopTimer = null;
  }, MENTRIXA_LOADING_DURATION_MS);
}

export function playMentrixaLoadingLoop(
  options: Pick<PlayMentrixaSoundOptions, "volume"> = {},
): void {
  if (loadingStopTimer) {
    clearTimeout(loadingStopTimer);
    loadingStopTimer = null;
  }
  loadingOnceSession += 1;
  stopHtmlAudioInstance("loading", false);
  startHtmlPlayback("loading", { loop: true, volume: options.volume });
}

export function playDuelSoundFromUserGesture(
  _options: Pick<PlayMentrixaSoundOptions, "volume"> = {},
): void {
  if (typeof window === "undefined" || isMentrixaSoundMuted()) return;
  stopMentrixaLoadingSound();
  startDuelLoopFromGesture();
}

export function playDuelSoundLoop(
  _options: Pick<PlayMentrixaSoundOptions, "volume"> = {},
): void {
  if (typeof window === "undefined" || isMentrixaSoundMuted()) return;
  stopMentrixaLoadingSound();
  ensureDuelLoopPlaying();
}

export { enterDuelQueueMusic, setArenaRouteActive, startDuelLoopFromGesture };

export function retainArenaDuelSound(): void {
  setArenaRouteActive(true);
}

export function releaseArenaDuelSound(): void {}

export function onMentrixaAudioUnlocked(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(AUDIO_UNLOCKED_EVENT, listener);
  return () => window.removeEventListener(AUDIO_UNLOCKED_EVENT, listener);
}

export function onDuelBufferReady(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(AUDIO_UNLOCKED_EVENT, listener);
  return () => window.removeEventListener(AUDIO_UNLOCKED_EVENT, listener);
}

export function stopDuelSound(): void {
  stopDuelLoop();
}

export function stopAllMentrixaSounds(): void {
  stopMentrixaLoadingSound();
  stopDuelLoop();
  for (const key of Object.keys(MENTRIXA_SOUND_SRC) as MentrixaSoundKey[]) {
    if (key !== "loading" && key !== "duel") {
      stopHtmlAudioInstance(key, false);
      stopHtmlAudioInstance(key, true);
    }
  }
}

export function registerDuelLoopElement(_el: HTMLAudioElement): void {
  /* legacy — audio lives in StudentNavbar */
}

export function isArenaAudioOutputUnlocked(): boolean {
  return true;
}
