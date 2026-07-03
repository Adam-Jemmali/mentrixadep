const CHUNK_RELOAD_KEY = "mentrixa-chunk-reload";
const CHUNK_RELOAD_COOLDOWN_MS = 10_000;

export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    const message = String(error ?? "");
    return /Loading chunk .* failed/i.test(message) || /ChunkLoadError/i.test(message);
  }
  return (
    error.name === "ChunkLoadError" ||
    /Loading chunk .* failed/i.test(error.message) ||
    /Failed to fetch dynamically imported module/i.test(error.message)
  );
}

/** One guarded full reload when stale dev chunks fail after HMR. */
export function reloadOnceOnChunkError(): boolean {
  if (typeof window === "undefined") return false;
  const last = sessionStorage.getItem(CHUNK_RELOAD_KEY);
  const now = Date.now();
  if (last && now - Number(last) < CHUNK_RELOAD_COOLDOWN_MS) return false;
  sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
  window.location.reload();
  return true;
}
