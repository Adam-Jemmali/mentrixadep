/**
 * Subtle tech-circle backdrop for hero cards (gamified dashboard feel).
 */
export function MentrixHeroDecor({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full opacity-[0.18] ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <radialGradient id="mentrix-hero-glow-a" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="white" stopOpacity="0.22" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="mentrix-hero-glow-b" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="cyan" stopOpacity="0.22" />
          <stop offset="100%" stopColor="cyan" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="85%" cy="15%" r="120" fill="url(#mentrix-hero-glow-a)" />
      <circle cx="10%" cy="80%" r="90" fill="url(#mentrix-hero-glow-b)" />
    </svg>
  );
}
