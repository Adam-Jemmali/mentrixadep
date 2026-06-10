/** Fire a short confetti burst (client-only; dynamic import). */
export async function fireRatingConfetti(): Promise<void> {
  if (typeof window === "undefined") return;
  const confetti = (await import("canvas-confetti")).default;
  await confetti({
    particleCount: 90,
    spread: 70,
    origin: { y: 0.65 },
    colors: ["#2563eb", "#22d3ee", "#a855f7", "#fbbf24"],
  });
}

/** Full-screen style burst for level-up (client-only). */
export async function fireLevelUpConfetti(): Promise<void> {
  if (typeof window === "undefined") return;
  const confetti = (await import("canvas-confetti")).default;
  const count = 200;
  const defaults = { origin: { y: 0.5 } };
  await confetti({
    ...defaults,
    particleCount: count,
    spread: 100,
    startVelocity: 45,
    colors: ["#0f172a", "#334155", "#64748b", "#f59e0b", "#10b981"],
  });
  await confetti({
    ...defaults,
    particleCount: Math.floor(count * 0.6),
    spread: 160,
    scalar: 0.9,
    colors: ["#1e293b", "#eab308"],
  });
}
