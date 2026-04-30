"use client";

import { Typewriter } from "@/components/ui/typewriter";

export function StudentHeroGreeting({ greeting, firstName }: { greeting: string; firstName: string }) {
  const texts = [
    greeting,
    `Ready to climb, ${firstName}?`,
    "Prove what you know.",
    "Beat the curve today.",
    "The best Guides are here."
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
