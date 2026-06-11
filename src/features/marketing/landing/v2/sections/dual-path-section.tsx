"use client";

import { ArenaMeshBackground } from "@/features/marketing/landing/v2/backgrounds/arena-mesh-background";
import { DualPathReactionGame, type DualPathSide } from "@/features/marketing/landing/v2/sections/dual-path-reaction-game";

const SIDES: DualPathSide[] = [
  {
    role: "Mentrixer",
    title: "Stop learning in private and hoping it stuck",
    points: [
      "One arena for whatever skill is in front of you now.",
      "Quest daily. Duel peers. Rank updates in public.",
      "Stuck? Book a Guide who sees your history and drills the right gap.",
    ],
    cta: "Start free →",
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
    <section id="path" className="relative overflow-hidden bg-[#0F172A] py-20 md:py-28">
      <ArenaMeshBackground variant="section" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <DualPathReactionGame sides={SIDES} />
      </div>
    </section>
  );
}
