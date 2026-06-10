"use client";

import { Typewriter } from "@/shared/ui/typewriter";

export function TutorHeroGreeting({ greeting, firstName }: { greeting: string; firstName: string }) {
  const texts = [
    greeting,
    `Ready to guide, ${firstName}?`,
    "Your learners are waiting.",
    "Share your expertise.",
    "Guide them to the win.",
    "Mentrixa Guide Center."
  ];

  return (
    <div className="h-[60px] md:h-[80px] flex items-center justify-start text-white text-2xl md:text-3xl font-black w-full">
      <Typewriter 
        text={texts} 
        speed={60}
        deleteSpeed={30}
        waitTime={3000}
        className="text-white drop-shadow-sm"
        cursorClassName="text-white/70"
      />
    </div>
  );
}
