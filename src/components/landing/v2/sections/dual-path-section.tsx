"use client";

import { ArenaMeshBackground } from "@/components/landing/v2/backgrounds/arena-mesh-background";
import { DualPathReactionGame, type DualPathSide } from "@/components/landing/v2/sections/dual-path-reaction-game";

const SIDES: DualPathSide[] = [
  {
    role: "Mentrixer",
    title: "You are done learning in private and hoping it stuck",
    points: [
      "Learner, professional, career switcher, certification chaser — one arena for whatever skill is in front of you right now.",
      "Quest daily. Duel your peers. Your division rank updates in public after every action.",
      "When the game hits a wall you cannot break alone, book a live Guide who sees your full history and drills exactly the right thing. Back on the ladder the same session.",
    ],
    cta: "Claim my spot free →",
    href: "/auth/signup",
    tone: "blue",
  },
  {
    role: "Guide",
    title: "You have spent years building expertise in something",
    points: [
      "Right now someone is paying $15 an hour for a worse version of what you know.",
      "Set your subject, set your rate, set your hours. Mentrixa finds the learners, handles the booking, and runs the checkout. Stripe deposits your earnings the moment the call ends.",
      "Quest drafts your session package. You review it in three minutes and send. The admin is gone. The teaching stays.",
    ],
    cta: "Apply to teach on Mentrixa →",
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
