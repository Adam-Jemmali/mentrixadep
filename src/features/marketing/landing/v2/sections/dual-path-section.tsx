"use client";

import { DualPathReactionGame, type DualPathSide } from "@/features/marketing/landing/v2/sections/dual-path-reaction-game";
import { GuideRankLadderPreview } from "@/features/marketing/landing/v2/sections/guide-rank-ladder-preview";
import { LandingSectionShell } from "@/features/marketing/landing/ui/landing-section-shell";

const SIDES: DualPathSide[] = [
  {
    role: "Mentrixer",
    title: "Stop learning in private and hoping it stuck",
    points: [
      "AP Calculus AB arena with verified first attempts only.",
      "Quest daily. Duel peers. Rank updates in public.",
      "Stuck? Book a Guide who sees your history and drills the right gap.",
    ],
    cta: "Start free ",
    href: "/auth/signup",
    tone: "blue",
  },
  {
    role: "Guide",
    title: "You know something others need",
    points: [
      "Learners pay $39 flat per breakthrough session.",
      "Set subject and hours. Mentrixa handles booking. Stripe pays when the call ends.",
      "Quest drafts the session pack. You review and send in minutes.",
    ],
    cta: "Apply as a Guide →",
    href: "/auth/signup?role=tutor",
    tone: "violet",
  },
];

export function DualPathSection() {
  return (
    <LandingSectionShell id="path">
      <DualPathReactionGame sides={SIDES} />
      <GuideRankLadderPreview />
    </LandingSectionShell>
  );
}
