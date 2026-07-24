/**
 * Subtle tech-circle backdrop for hero cards (gamified dashboard feel).
 */
export function MentrixHeroDecor({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full opacity-[0.28] ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <radialGradient id="mentrix-hero-glow-violet" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--mx-violet)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--mx-violet)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="mentrix-hero-glow-indigo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--mx-indigo)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="var(--mx-indigo)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="mentrix-hero-glow-cyan" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--mx-cyan)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--mx-cyan)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="88%" cy="12%" r="130" fill="url(#mentrix-hero-glow-violet)" />
      <circle cx="12%" cy="78%" r="100" fill="url(#mentrix-hero-glow-cyan)" />
      <circle cx="52%" cy="42%" r="80" fill="url(#mentrix-hero-glow-indigo)" />
    </svg>
  );
}
