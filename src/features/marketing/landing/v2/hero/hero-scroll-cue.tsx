"use client";

/** Static scroll cue — no infinite CSS bob (low-end / no-GPU). */
export function HeroScrollCue() {
  return (
    <a
      href="#outcomes"
      className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#475569] transition-colors hover:text-[#0B1220]"
      aria-label="Scroll to see what you get"
    >
      <span>Explore</span>
      <svg className="size-4 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </a>
  );
}
