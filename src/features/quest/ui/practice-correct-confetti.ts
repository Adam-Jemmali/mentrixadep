/** Emerald burst when a practice answer is correct (client-only). */
export async function fireCorrectAnswerConfetti(): Promise<void> {
  if (typeof window === "undefined") return;
  const confetti = (await import("canvas-confetti")).default;
  const colors = ["#10b981", "#34d399", "#6ee7b7", "#059669", "#a7f3d0", "#fbbf24"];
  void confetti({
    particleCount: 80,
    spread: 92,
    origin: { y: 0.5 },
    colors,
    ticks: 200,
  });
  void confetti({
    particleCount: 32,
    angle: 70,
    spread: 64,
    origin: { x: 0.1, y: 0.58 },
    colors,
  });
  void confetti({
    particleCount: 32,
    angle: 110,
    spread: 64,
    origin: { x: 0.9, y: 0.58 },
    colors,
  });
}
