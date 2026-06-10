"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/shared/core/utils";
import { ensureDuelLoopPlaying, isArenaPath } from "@/features/duels/duel-audio-controller";
import {
  isMentrixaSoundMuted,
  onMentrixaSoundMuteChange,
  setMentrixaSoundMuted,
} from "@/shared/integrations/mentrixa-sounds";

type Props = {
  className?: string;
  variant?: "icon" | "menu";
};

export function ArenaMusicMuteToggle({ className, variant = "icon" }: Props) {
  const pathname = usePathname();
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(isMentrixaSoundMuted());
    return onMentrixaSoundMuteChange(setMuted);
  }, []);

  function toggle() {
    const next = !muted;
    setMuted(next);
    setMentrixaSoundMuted(next);
    if (!next && isArenaPath(pathname)) {
      ensureDuelLoopPlaying();
    }
  }

  if (variant === "menu") {
    return (
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-slate-900 transition hover:bg-slate-50",
          className,
        )}
      >
        {muted ? <VolumeX className="h-4 w-4 shrink-0" aria-hidden /> : <Volume2 className="h-4 w-4 shrink-0" aria-hidden />}
        {muted ? "Unmute arena music" : "Mute arena music"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={muted ? "Unmute arena music" : "Mute arena music"}
      aria-pressed={muted}
      title={muted ? "Unmute arena music" : "Mute arena music"}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white",
        muted && "text-white/45",
        className,
      )}
    >
      {muted ? <VolumeX className="h-4 w-4" aria-hidden /> : <Volume2 className="h-4 w-4" aria-hidden />}
    </button>
  );
}
