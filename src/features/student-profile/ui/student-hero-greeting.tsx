"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const Typewriter = dynamic(
  () => import("@/shared/ui/typewriter").then((m) => ({ default: m.Typewriter })),
  { ssr: false, loading: () => null },
);

export function StudentHeroGreeting({ greeting, firstName }: { greeting: string; firstName: string }) {
  const [motionReady, setMotionReady] = useState(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setMotionReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  const texts = [
    greeting,
    `Ready to climb, ${firstName}?`,
    "Prove what you know.",
    "Beat the curve today.",
    "The best Guides are here.",
  ];

  return (
    <div className="flex h-[60px] w-full items-center justify-start text-2xl font-black text-white md:h-[80px] md:text-3xl">
      {motionReady ? (
        <Typewriter
          text={texts}
          speed={60}
          deleteSpeed={30}
          waitTime={3000}
          className="text-white drop-shadow-sm"
          cursorClassName="text-white/70"
        />
      ) : (
        <span className="text-white drop-shadow-sm">{greeting}</span>
      )}
    </div>
  );
}
