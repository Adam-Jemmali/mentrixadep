/** Shared landing chrome: grain + ambient glows. */
export function LandingBackground() {
  return (
    <>
      <div className="lp-hero-noise pointer-events-none fixed inset-0 z-50 opacity-[0.025]" aria-hidden />
      <div
        className="pointer-events-none absolute -left-40 -top-40 h-[800px] w-[800px] rounded-full bg-[var(--mx-violet)]/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-32 -right-24 h-[600px] w-[600px] rounded-full bg-[var(--mx-gold)]/[0.08] blur-3xl"
        aria-hidden
      />
    </>
  );
}
