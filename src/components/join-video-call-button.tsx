"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface JoinVideoCallButtonProps {
  sessionId: string;
  startTime: string;
  endTime: string;
}

export function JoinVideoCallButton({
  sessionId,
  startTime,
  endTime,
}: JoinVideoCallButtonProps) {
  const [isChecking, setIsChecking] = useState(false);
  const router = useRouter();

  const now = new Date();
  const sessionStart = new Date(startTime);
  const sessionEnd = new Date(endTime);
  const windowStart = new Date(sessionStart.getTime() - 5 * 60 * 1000); // 5 minutes before
  const windowEnd = new Date(sessionEnd.getTime() + 15 * 60 * 1000); // 15 minutes after

  // Check if we're within the time window
  const isWithinWindow = now >= windowStart && now <= windowEnd;
  const isBeforeWindow = now < windowStart;
  const isAfterWindow = now > windowEnd;

  if (isAfterWindow) {
    return null; // Don't show button after window closes
  }

  if (isBeforeWindow) {
    const minutesUntil = Math.ceil((windowStart.getTime() - now.getTime()) / (60 * 1000));
    return (
      <button
        disabled
        className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-semibold cursor-not-allowed"
        title={`Video call opens in ${minutesUntil} minute${minutesUntil !== 1 ? "s" : ""}`}
      >
        📹 Join Call (in {minutesUntil}m)
      </button>
    );
  }

  const handleJoin = async () => {
    setIsChecking(true);
    router.push(`/video/session/${sessionId}`);
  };

  return (
    <button
      onClick={handleJoin}
      disabled={isChecking}
      className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-green-400 disabled:to-emerald-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold shadow-sm hover:shadow transition-all"
    >
      {isChecking ? "Joining..." : "📹 Join Video Call"}
    </button>
  );
}

