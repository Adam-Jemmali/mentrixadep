"use client";

import type { ReactNode } from "react";

/** Overt/covert security artwork layers for in-scene passport pages. */
export function PassportPageSecurityLayer({ variant = "visa" }: { variant?: "visa" | "biodata" }) {
  return (
    <>
      <div
        className={
          variant === "biodata"
            ? "rank-passport-security-biodata pointer-events-none absolute inset-0"
            : "rank-passport-security-visa pointer-events-none absolute inset-0"
        }
        aria-hidden
      />
      <div className="rank-passport-hologram-strip pointer-events-none absolute inset-y-0 right-3 w-8" aria-hidden />
      <div className="rank-passport-watermark-register pointer-events-none absolute inset-0" aria-hidden />
      <div className="rank-passport-microprint pointer-events-none absolute inset-x-0 bottom-1" aria-hidden />
    </>
  );
}

export function PassportBiodataShell({ children }: { children: ReactNode }) {
  return (
    <div className="rank-passport-biodata-shell relative h-full">
      <PassportPageSecurityLayer variant="biodata" />
      <div className="rank-passport-chip-badge pointer-events-none absolute right-2 top-2 z-[2]" aria-hidden>
        <span className="text-[7px] font-black uppercase tracking-[0.2em] text-[#6366F1]">ePassport</span>
      </div>
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
