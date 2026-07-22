"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { PassportPageSecurityLayer } from "@/features/rank-card/rank-passport-security-layer";
import { MENTRIXA_LOGO_PNG } from "@/features/marketing/mentrixa-brand";
import { cn } from "@/shared/core/utils";

/** Pixel canvas for in-scene Html — matched to 3D page mesh aspect. */
export const PASSPORT_PAGE_W_PX = 460;
export const PASSPORT_PAGE_H_PX = 690;

/** World units for one passport page in the 3D scene. */
export const PASSPORT_PAGE_W_UNITS = 2.15;
export const PASSPORT_PAGE_H_UNITS = 3.2;
export const PASSPORT_CAMERA_Z = 3.85;
export const PASSPORT_CAMERA_FOV = 48;
export const PASSPORT_VIEWPORT_H = 720;
/** Fine-tuning scale applied to the whole book group in the canvas. */
export const PASSPORT_BOOK_SCALE = 1;
/** Fine-tunes Html overlay scale so page chrome fills the 3D plane edge-to-edge. */
export const PASSPORT_HTML_BLEED_BOOST = 1.02;

/**
 * Html `transform` scale in drei: world width ≈ clientWidth * (factor / 400).
 * Match one page mesh width (world units) to the chrome pixel width.
 */
export function passportHtmlDistanceFactor(
  pageWorldW = PASSPORT_PAGE_W_UNITS,
  pagePxW = PASSPORT_PAGE_W_PX,
  bleedBoost = PASSPORT_HTML_BLEED_BOOST,
) {
  return (pageWorldW * 400 * PASSPORT_BOOK_SCALE * bleedBoost) / pagePxW;
}

const STAMP_COLORS = {
  red: { ring: "#DC2626", ink: "#991B1B", bg: "rgba(254,226,226,0.35)" },
  blue: { ring: "#2563EB", ink: "#1D4ED8", bg: "rgba(219,234,254,0.4)" },
  purple: { ring: "#7C3AED", ink: "#5B21B6", bg: "rgba(237,233,254,0.45)" },
} as const;

export const PASSPORT_STAMP_BY_INDEX = [
  { label: "Verified entry", sublabel: "Rank proof", tone: "blue" as const, rotation: -12 },
  { label: "Identity", sublabel: "Mentrixer", tone: "purple" as const, rotation: 14 },
  { label: "Skill proof", sublabel: "AP Calc AB", tone: "red" as const, rotation: -8 },
  { label: "Grid stamp", sublabel: "Mastery", tone: "blue" as const, rotation: 16 },
  { label: "Breakthrough", sublabel: "Receipt", tone: "purple" as const, rotation: -15 },
  { label: "Live record", sublabel: "Public", tone: "red" as const, rotation: 10 },
];

export function passportPageStamp(index: number) {
  return PASSPORT_STAMP_BY_INDEX[index % PASSPORT_STAMP_BY_INDEX.length];
}

/** Visa artwork on content pages; biodata page uses in-content security shell. */
export function passportPageSecurityVariant(pageIndex: number): "visa" | "biodata" | "none" {
  return pageIndex === 1 ? "none" : "visa";
}

export function passportPagePaperTone(pageIndex: number): "visa" | "biodata" {
  return pageIndex === 1 ? "biodata" : "visa";
}

export function PassportEntryStamp({
  label,
  sublabel,
  tone = "blue",
  rotation = -12,
  className,
  animateIn = false,
}: {
  label: string;
  sublabel?: string;
  tone?: keyof typeof STAMP_COLORS;
  rotation?: number;
  className?: string;
  animateIn?: boolean;
}) {
  const palette = STAMP_COLORS[tone];

  return (
    <div
      className={cn(
        "rank-passport-stamp pointer-events-none absolute select-none rounded-full border-[3px] border-double px-4 py-2.5 text-center",
        animateIn && "rank-passport-stamp--enter",
        className,
      )}
      style={{
        ["--stamp-rotation" as string]: `${rotation}deg`,
        transform: `rotate(${rotation}deg)`,
        borderColor: palette.ring,
        color: palette.ink,
        backgroundColor: palette.bg,
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.35)",
      }}
      aria-hidden
    >
      <p className="text-xs font-black uppercase tracking-[0.12em]">{label}</p>
      {sublabel ? (
        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.08em] opacity-80">{sublabel}</p>
      ) : null}
    </div>
  );
}

export function PassportPageChrome({
  children,
  side,
  stamp,
  animateStamp = false,
  stampEpoch = 0,
  securityVariant = "visa",
  paperTone = "visa",
}: {
  children: ReactNode;
  side: "left" | "right";
  stamp?: { label: string; sublabel?: string; tone?: keyof typeof STAMP_COLORS; rotation?: number };
  animateStamp?: boolean;
  stampEpoch?: number;
  securityVariant?: "visa" | "biodata" | "none";
  paperTone?: "visa" | "biodata";
}) {
  return (
    <div
      className={cn(
        "rank-passport-page-paper relative overflow-hidden rounded-none",
        (securityVariant === "biodata" || paperTone === "biodata") && "rank-passport-page-paper--biodata",
      )}
      style={{ width: PASSPORT_PAGE_W_PX, height: PASSPORT_PAGE_H_PX }}
    >
      {securityVariant !== "none" ? (
        <PassportPageSecurityLayer variant={securityVariant === "biodata" ? "biodata" : "visa"} />
      ) : null}
      {stamp ? (
        <p
          className={cn(
            "rank-passport-page-title mx-hub-type-ui border-b border-[#C4B5FD]/60 px-3 pb-2.5 pt-4 text-[#4F46E5]",
          )}
        >
          {stamp.label}
        </p>
      ) : null}
      <div
        className={cn(
          "rank-passport-page-ink relative z-[1] h-full min-h-0 px-3 pb-6",
          stamp ? "pt-3" : "pt-5",
        )}
        style={stamp ? { height: "calc(100% - 3rem)" } : { height: "100%" }}
      >
        {children}
      </div>
      {stamp ? (
        <PassportEntryStamp
          key={`page-stamp-${stampEpoch}-${stamp.label}`}
          label={stamp.label}
          sublabel={stamp.sublabel}
          tone={stamp.tone}
          rotation={stamp.rotation ?? (side === "left" ? -14 : 11)}
          animateIn={animateStamp}
          className={side === "left" ? "bottom-6 right-4" : "bottom-10 left-3"}
        />
      ) : null}
      {side === "right" ? (
        <PassportEntryStamp
          key={`verified-stamp-${stampEpoch}`}
          label="Verified"
          sublabel="First try"
          tone="purple"
          rotation={18}
          animateIn={animateStamp}
          className="top-5 right-4 opacity-75"
        />
      ) : null}
    </div>
  );
}

export function PassportCoverFace({ subjectLabel }: { subjectLabel: string }) {
  return (
    <div
      className="flex flex-col items-center justify-between overflow-hidden rounded-none bg-[#0B1220] px-8 py-10 text-center"
      style={{ width: PASSPORT_PAGE_W_PX, height: PASSPORT_PAGE_H_PX }}
    >
      <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#D4A017]/40 bg-[#0B1220]/60">
        <Image
          src={MENTRIXA_LOGO_PNG}
          alt="Mentrixa"
          width={96}
          height={96}
          className="h-24 w-24 object-contain"
          priority
          sizes="96px"
        />
      </div>
      <div className="space-y-4">
        <p className="rank-passport-3d-foil rank-passport-3d-foil--holo text-[2.1rem] font-black leading-none tracking-[0.22em]">
          MENTRIXA
        </p>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#94A3B8]">Verified passport</p>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">{subjectLabel}</p>
      </div>
      <span className="text-sm font-black uppercase tracking-[0.14em] text-[#6366F1]">Tap to open</span>
    </div>
  );
}
