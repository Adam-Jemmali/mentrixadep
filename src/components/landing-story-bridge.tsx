"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { SparklesCore } from "@/components/ui/sparkles";

type Props = {
  chapter: string;
  title: string;
  subtitle: string;
};

export function LandingStoryBridge({ chapter, title, subtitle }: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.45 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative flex min-h-[26vh] items-center justify-center overflow-hidden border-y border-white/10 bg-[radial-gradient(70%_120%_at_50%_50%,rgba(56,189,248,0.16)_0%,rgba(15,23,42,0.88)_65%,rgba(2,6,23,0.98)_100%)] px-6 py-10"
      aria-label={`${chapter} transition`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[url('/mentrixalogo/logo.png')] bg-[length:108px_108px] bg-repeat opacity-[0.055]" />
      
      <div className="pointer-events-none absolute inset-0 z-0">
        <SparklesCore
          id={`sparkles-${chapter.replace(/\s+/g, '-')}`}
          background="transparent"
          minSize={0.4}
          maxSize={1.2}
          particleDensity={60}
          className="h-full w-full"
          particleColor="#60A5FA"
          speed={1}
        />
      </div>

      <div
        className={cn(
          "relative z-10 mx-auto max-w-3xl text-center transition-all duration-700",
          visible ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0",
        )}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/85">{chapter}</p>
        <h3 className="mt-3 text-[clamp(22px,3.6vw,36px)] font-black tracking-[-0.03em] text-white">{title}</h3>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-slate-200/85">{subtitle}</p>
      </div>
    </section>
  );
}
