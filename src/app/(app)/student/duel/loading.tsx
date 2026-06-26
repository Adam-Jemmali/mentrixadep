"use client";

import { useEffect } from "react";
import { playDuelSoundLoop, warmMentrixaSoundAssets } from "@/shared/integrations/mentrixa-sounds";
import { DuelHubSkeleton } from "@/shared/ui/skeleton-patterns";

export default function DuelSegmentLoading() {
  useEffect(() => {
    warmMentrixaSoundAssets();
    playDuelSoundLoop();
  }, []);

  return <DuelHubSkeleton />;
}
