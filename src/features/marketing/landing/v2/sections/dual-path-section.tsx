"use client";

import Link from "next/link";
import { cn } from "@/shared/core/utils";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";
import { LANDING_DUAL_PATH } from "@/features/marketing/landing/landing-copy-pure";
import { LandingSectionShell } from "@/features/marketing/landing/ui/landing-section-shell";
import { LandingStickyNote } from "@/features/marketing/landing/ui/landing-sticky-note";

const ICON_VERSION = "20260410";

type Side = (typeof LANDING_DUAL_PATH.sides)[number];

function RoleIcon({ role }: { role: Side["role"] }) {
  const src = role === "Mentrixer" ? `/icons/mentrixer.svg?v=${ICON_VERSION}` : `/icons/guide.svg?v=${ICON_VERSION}`;
  return (
    <img
      src={src}
      alt=""
      width={40}
      height={40}
      draggable={false}
      className="pointer-events-none select-none object-contain"
      aria-hidden
    />
  );
}

function SideCard({ side }: { side: Side }) {
  return (
    <LandingStickyNote
      variant={side.role === "Mentrixer" ? "pinned" : "clip"}
      className="relative overflow-hidden p-6"
    >
      <div className="mb-4 flex items-center gap-3">
        <RoleIcon role={side.role} />
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wide ${landingHub.eyebrow}`}>{side.role}</p>
          <h3 className={`text-lg font-bold ${landingHub.title}`}>{side.title}</h3>
        </div>
      </div>
      <ul className="mb-5 space-y-2">
        {side.points.map((point) => (
          <li key={point} className={`flex gap-2 text-sm ${landingHub.body}`}>
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7C3AED]" aria-hidden />
            <span>{point}</span>
          </li>
        ))}
      </ul>
      <Link
        href={side.href}
        className={cn(
          "inline-flex min-h-11 w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-bold",
          landingHub.btnPrimary,
        )}
      >
        {side.cta}
      </Link>
    </LandingStickyNote>
  );
}

/** Static Mentrixer / Guide paths — no falling-slice arena or framer layout thrash. */
export function DualPathSection() {
  return (
    <LandingSectionShell id="path">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <h2 className={`text-2xl font-bold sm:text-3xl ${landingHub.title}`}>
            {LANDING_DUAL_PATH.pathHeading}
          </h2>
          <p className={`mx-auto mt-3 max-w-2xl ${landingHub.body}`}>{LANDING_DUAL_PATH.pathSub}</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {LANDING_DUAL_PATH.sides.map((side) => (
            <SideCard key={side.role} side={side} />
          ))}
        </div>
      </div>
    </LandingSectionShell>
  );
}
