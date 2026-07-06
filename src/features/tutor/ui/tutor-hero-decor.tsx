"use client";

export function TutorHeroDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Soft glowing orbs for that premium elite feel */}
      <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-violet-500/10 blur-[80px]" />
      <div className="absolute -right-20 -bottom-20 h-80 w-80 rounded-full bg-indigo-500/10 blur-[100px]" />
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-[length:20px_20px] opacity-[0.03]" />
      
      {/* Decorative lines */}
      <div className="absolute right-0 top-0 h-px w-1/2 bg-gradient-to-l from-[#C4B5FD]/60 to-transparent" />
      <div className="absolute bottom-0 left-0 h-px w-1/3 bg-gradient-to-r from-[#C4B5FD]/60 to-transparent" />
    </div>
  );
}
