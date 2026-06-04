"use client";

import { useEffect } from "react";
import { playDuelSoundLoop, warmMentrixaSoundAssets } from "@/lib/mentrixa-sounds";

export default function DuelSegmentLoading() {
  useEffect(() => {
    warmMentrixaSoundAssets();
    playDuelSoundLoop();
  }, []);
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="h-3 w-28 rounded bg-slate-800/45 motion-safe:animate-pulse" />
          <div className="h-9 w-56 max-w-full rounded-lg bg-slate-800/40 motion-safe:animate-pulse" />
          <div className="h-4 w-full max-w-md rounded bg-slate-800/30 motion-safe:animate-pulse" />
        </div>
        <div className="h-9 w-36 rounded-xl bg-slate-800/35 motion-safe:animate-pulse" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-40 rounded-3xl border border-white/10 bg-slate-950/35 motion-safe:animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
