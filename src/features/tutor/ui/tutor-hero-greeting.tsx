"use client";

import { Typewriter } from "@/shared/ui/typewriter";
import { cn } from "@/shared/core/utils";

export function TutorHeroGreeting({
  greeting,
  firstName,
  tone = "light",
}: {
  greeting: string;
  firstName: string;
  tone?: "light" | "dark";
}) {
  const texts = [
    greeting,
    `Ready to guide, ${firstName}?`,
    "Your learners are waiting.",
    "Share your expertise.",
    "Guide them to the win.",
    "Mentrixa Guide Center.",
  ];

  const onLight = tone === "light";

  return (
    <div
      className={cn(
        "flex h-[60px] w-full items-center justify-start text-2xl font-black md:h-[80px] md:text-3xl",
        onLight ? "text-[var(--mx-navy)]" : "text-white",
      )}
    >
      <Typewriter
        text={texts}
        speed={60}
        deleteSpeed={30}
        waitTime={3000}
        className={cn(onLight ? "text-[var(--mx-navy)]" : "text-white drop-shadow-sm")}
        cursorClassName={onLight ? "text-[var(--mx-indigo)]" : "text-white/70"}
      />
    </div>
  );
}
