export function canStartUnlockBloom(
  wasUnlocked: boolean,
  isUnlocked: boolean,
  reducedMotion: boolean,
  forceFromOpenedHighlight = false,
): boolean {
  if (reducedMotion || !isUnlocked) return false;
  if (forceFromOpenedHighlight) return true;
  return !wasUnlocked;
}

export function canRenderUnlockBloom(
  bloom: boolean,
  reducedMotion: boolean,
): boolean {
  return bloom && !reducedMotion;
}
