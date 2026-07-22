"use client";

import type { ReactNode } from "react";
import { cn } from "@/shared/core/utils";

/** Pixel canvas for in-scene Html — matched to 3D page mesh aspect. */
export const PASSPORT_PAGE_W_PX = 520;
export const PASSPORT_PAGE_H_PX = 780;

/** World units for one passport page in the 3D scene. */
export const PASSPORT_PAGE_W_UNITS = 3.05;
export const PASSPORT_PAGE_H_UNITS = 4.55;
export const PASSPORT_CAMERA_Z = 3.55;
export const PASSPORT_CAMERA_FOV = 48;
export const PASSPORT_VIEWPORT_H = 920;

/** Scales Html overlays to match page mesh width at the default camera. */
export function passportHtmlDistanceFactor(
  cameraZ = PASSPORT_CAMERA_Z,
  fov = PASSPORT_CAMERA_FOV,
  viewportH = PASSPORT_VIEWPORT_H,
) {
  const vFov = (fov * Math.PI) / 180;
  const denom = PASSPORT_PAGE_W_PX * 2 * Math.tan(vFov / 2) * cameraZ;
  return (PASSPORT_PAGE_W_UNITS * viewportH) / denom;
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

export function PassportEntryStamp({
  label,
  sublabel,
  tone = "blue",
  rotation = -12,
  className,
}: {
  label: string;
  sublabel?: string;
  tone?: keyof typeof STAMP_COLORS;
  rotation?: number;
  className?: string;
}) {
  const palette = STAMP_COLORS[tone];

  return (
    <div
      className={cn(
        "rank-passport-stamp pointer-events-none absolute select-none rounded-full border-[3px] border-double px-4 py-2.5 text-center",
        className,
      )}
      style={{
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
}: {
  children: ReactNode;
  side: "left" | "right";
  stamp?: { label: string; sublabel?: string; tone?: keyof typeof STAMP_COLORS; rotation?: number };
}) {
  return (
    <div
      className={cn(
        "rank-passport-page-paper relative overflow-hidden",
        side === "left" ? "rounded-l-[4px]" : "rounded-r-[4px]",
      )}
      style={{ width: PASSPORT_PAGE_W_PX, height: PASSPORT_PAGE_H_PX }}
    >
      {stamp ? (
        <p
          className={cn(
            "rank-passport-page-title mx-hub-type-ui border-b border-[#C4B5FD]/60 pb-2.5 pt-4 text-[#4F46E5]",
            side === "left" ? "pl-5 pr-7" : "pl-8 pr-4",
          )}
        >
          {stamp.label}
        </p>
      ) : null}
      <div
        className={cn(
          "rank-passport-page-ink relative z-[1] pb-6",
          side === "left" ? "pl-5 pr-7" : "pl-8 pr-4",
          stamp ? "pt-3" : "pt-5",
        )}
        style={stamp ? { height: "calc(100% - 3rem)" } : { height: "100%" }}
      >
        {children}
      </div>
      {stamp ? (
        <PassportEntryStamp
          label={stamp.label}
          sublabel={stamp.sublabel}
          tone={stamp.tone}
          rotation={stamp.rotation ?? (side === "left" ? -14 : 11)}
          className={side === "left" ? "bottom-6 right-4" : "bottom-10 left-3"}
        />
      ) : null}
      {side === "right" ? (
        <PassportEntryStamp
          label="Verified"
          sublabel="First try"
          tone="purple"
          rotation={18}
          className="top-5 right-4 opacity-75"
        />
      ) : null}
    </div>
  );
}

export function PassportCoverFace({ subjectLabel }: { subjectLabel: string }) {
  return (
    <div
      className="flex flex-col items-center justify-between px-10 py-14 text-center"
      style={{ width: PASSPORT_PAGE_W_PX, height: PASSPORT_PAGE_H_PX }}
    >
      <div className="rank-passport-3d-foil rank-passport-3d-foil--holo rank-passport-3d-foil--logo flex h-32 w-32 items-center justify-center rounded-full border-2 border-[#D4A017]/40">
        <span className="text-6xl font-black tracking-[0.2em]">M</span>
      </div>
      <div className="space-y-5">
        <p className="rank-passport-3d-foil rank-passport-3d-foil--holo text-[2.75rem] font-black leading-none tracking-[0.22em]">
          MENTRIXA
        </p>
        <p className="text-lg font-bold uppercase tracking-[0.2em] text-[#94A3B8]">Verified passport</p>
        <p className="text-base font-semibold uppercase tracking-[0.12em] text-[#64748B]">{subjectLabel}</p>
      </div>
      <span className="text-base font-black uppercase tracking-[0.14em] text-[#6366F1]">Tap to open</span>
    </div>
  );
}
