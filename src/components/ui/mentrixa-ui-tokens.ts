/** Visual tokens for @/components/ui registry wrappers. Logic lives in upstream primitives. */

export const mxUi = {
  shell: "bg-[var(--mx-surface)] text-slate-100",
  shellLight: "bg-white/90 text-[var(--mx-navy)]",
  border: "border-white/10",
  borderLight: "border-[#E0E7FF]",
  primary: "text-[var(--mx-violet)]",
  gold: "text-[var(--mx-gold)]",
  muted: "text-[#94A3B8]",
  mutedLight: "text-[#475569]",
  card: "rounded-[var(--radius-card)] border border-white/10 bg-[var(--mx-surface-2)]",
  cardLight: "rounded-[var(--radius-card)] border border-[#E0E7FF] bg-white/85",
  ringTrack: "stroke-white/10",
  ringFill: "stroke-[var(--mx-violet)]",
  ringFillGold: "stroke-[var(--mx-gold)]",
  shimmerFrom: "rgba(11,18,32,0.2)",
  shimmerTo: "rgba(11,18,32,0.4)",
} as const;
