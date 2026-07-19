export function canStartUnlockBloom(
  wasUnlocked: boolean,
  isUnlocked: boolean,
  reducedMotion: boolean,
): boolean {
  return !wasUnlocked && isUnlocked && !reducedMotion;
}

export function canRenderUnlockBloom(
  bloom: boolean,
  reducedMotion: boolean,
): boolean {
  return bloom && !reducedMotion;
}
