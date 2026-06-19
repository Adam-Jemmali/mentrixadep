/** Fire a celebratory burst when XP is earned (client-only). */
export async function fireXpRewardConfetti(): Promise<void> {
  if (typeof window === "undefined") return;
  const confetti = (await import("canvas-confetti")).default;
  const colors = ["#2563eb", "#6366f1", "#a855f7", "#22d3ee", "#fbbf24", "#34d399"];
  void confetti({
    particleCount: 70,
    spread: 88,
    origin: { y: 0.52 },
    colors,
    ticks: 180,
  });
  void confetti({
    particleCount: 28,
    angle: 60,
    spread: 58,
    origin: { x: 0.08, y: 0.62 },
    colors,
  });
  void confetti({
    particleCount: 28,
    angle: 120,
    spread: 58,
    origin: { x: 0.92, y: 0.62 },
    colors,
  });
}

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
    colors: ["#0f172a", "#334155", "#64748b", "#2563eb", "#4f46e5", "#7c3aed"],
  });
  await confetti({
    ...defaults,
    particleCount: Math.floor(count * 0.6),
    spread: 160,
    scalar: 0.9,
    colors: ["#1e293b", "#38bdf8", "#4f46e5"],
  });
}

/** Gold particle rain — MENTRIXER rank reveal only. */
export async function fireMentrixerGoldRain(): Promise<void> {
  if (typeof window === "undefined") return;
  const confetti = (await import("canvas-confetti")).default;
  const gold = ["#D4A017", "#F5D76E", "#B8860B", "#FFF8E7"];
  const durationMs = 2800;
  const end = Date.now() + durationMs;

  const frame = () => {
    confetti({
      particleCount: 4,
      angle: 270,
      spread: 36,
      startVelocity: 28,
      origin: { x: Math.random(), y: -0.05 },
      colors: gold,
      gravity: 1.1,
      scalar: 1.1,
      drift: Math.random() * 0.4 - 0.2,
    });
    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };
  frame();
}
