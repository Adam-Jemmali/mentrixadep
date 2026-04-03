"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface JoinVideoCallButtonProps {
  sessionId: string;
  startTime: string;
  endTime: string;
}

/** Join opens 5 minutes before start; remains available through 24h after end (wrap-up). */
export function JoinVideoCallButton({ sessionId, startTime, endTime }: JoinVideoCallButtonProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [phase, setPhase] = useState<"early" | "open" | "ended">("early");
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);

    const tick = () => {
      const now = Date.now();
      const start = new Date(startTime).getTime();
      const sessionEnd = new Date(endTime).getTime();
      const joinOpensAt = start - 5 * 60 * 1000;
      const windowEnd = sessionEnd + 24 * 60 * 60 * 1000;

      if (now > windowEnd) {
        setPhase("ended");
      } else if (now < joinOpensAt) {
        setPhase("early");
      } else {
        setPhase("open");
      }
    };

    tick();
    const interval = setInterval(tick, 5000);
    return () => clearInterval(interval);
  }, [startTime, endTime]);

  const handleJoin = async () => {
    setIsChecking(true);
    router.push(`/video/session/${sessionId}`);
  };

  if (!isMounted) {
    return (
      <Button size="sm" disabled className="min-w-[120px]">
        Join session
      </Button>
    );
  }

  if (phase === "ended") {
    return (
      <Button size="sm" variant="outline" disabled className="min-w-[120px]">
        Session ended
      </Button>
    );
  }

  if (phase === "early") {
    return (
      <Button
        size="sm"
        variant="secondary"
        disabled
        className="min-w-[120px]"
        title="Join opens 5 minutes before the scheduled start time."
      >
        Join session
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      onClick={handleJoin}
      disabled={isChecking}
      className="min-w-[120px] bg-slate-900 hover:bg-slate-800"
    >
      {isChecking ? "Joining…" : "Join session"}
    </Button>
  );
}
