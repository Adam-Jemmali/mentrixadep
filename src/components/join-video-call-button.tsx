"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface JoinVideoCallButtonProps {
  sessionId: string;
  startTime: string;
  endTime: string;
}

export function JoinVideoCallButton({ sessionId, startTime: _startTime, endTime }: JoinVideoCallButtonProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [joinable, setJoinable] = useState(false);
  const [isAfterWindow, setIsAfterWindow] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);

    const calculateTimeStatus = () => {
      const now = new Date();
      const sessionEnd = new Date(endTime);
      // Allow joining anytime before the scheduled end (early lobby), through 24h after end for wrap-up.
      const windowEnd = new Date(sessionEnd.getTime() + 24 * 60 * 60 * 1000);
      setJoinable(now <= windowEnd);
      setIsAfterWindow(now > windowEnd);
    };

    calculateTimeStatus();
    const interval = setInterval(calculateTimeStatus, 60000);

    return () => clearInterval(interval);
  }, [endTime]);

  const handleJoin = async () => {
    setIsChecking(true);
    router.push(`/video/session/${sessionId}`);
  };

  if (!isMounted) {
    return (
      <Button size="sm" disabled>
        Join session
      </Button>
    );
  }

  if (isAfterWindow) {
    return null;
  }

  if (!joinable) {
    return (
      <Button size="sm" variant="outline" disabled>
        Session window ended
      </Button>
    );
  }

  return (
    <Button size="sm" onClick={handleJoin} disabled={isChecking}>
      {isChecking ? "Joining..." : "Join session"}
    </Button>
  );
}

