"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface JoinVideoCallButtonProps {
  sessionId: string;
  startTime: string;
  endTime: string;
}

/** Join is available immediately after booking; remains available through 24h after end (wrap-up). */
export function JoinVideoCallButton({ sessionId, startTime, endTime }: JoinVideoCallButtonProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [phase, setPhase] = useState<"open" | "ended">("open");
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);

    const tick = () => {
      const now = Date.now();
      const sessionEnd = new Date(endTime).getTime();
      const windowEnd = sessionEnd + 24 * 60 * 60 * 1000;

      if (now > windowEnd) {
        setPhase("ended");
      } else {
        setPhase("open");
      }
    };

    tick();
    const interval = setInterval(tick, 5000);
    return () => clearInterval(interval);
  }, [startTime, endTime]);

  const handleJoin = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsChecking(true);
    try {
      router.push(`/video/session/${sessionId}`);
    } catch (error) {
      console.error("Failed to join session:", error);
      setIsChecking(false);
    }
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
