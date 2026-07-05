"use client";

import { DualPathReactionGame } from "@/features/marketing/landing/v2/sections/dual-path-reaction-game";
import { LandingSectionShell } from "@/features/marketing/landing/ui/landing-section-shell";
import { LANDING_DUAL_PATH } from "@/features/marketing/landing/landing-copy-pure";

export function DualPathSection() {
  return (
    <LandingSectionShell id="path">
      <DualPathReactionGame
        sides={LANDING_DUAL_PATH.sides.map((side) => ({
          ...side,
          points: [...side.points],
        }))}
      />
    </LandingSectionShell>
  );
}
