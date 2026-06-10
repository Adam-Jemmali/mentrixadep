"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/shared/core/utils";

type Props = {
  text: string;
  className?: string;
  /** Milliseconds per character */
  speed?: number;
  startDelay?: number;
  showCursor?: boolean;
  onComplete?: () => void;
  /** Restart when text changes */
  resetKey?: string;
};

export function TypewriterText({
  text,
  className,
  speed = 26,
  startDelay = 0,
  showCursor = true,
  onComplete,
  resetKey,
}: Props) {
  const reducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (reducedMotion) {
      setVisible((prev) => (prev === text.length ? prev : text.length));
      onCompleteRef.current?.();
      return;
    }

    setVisible(0);
    let index = 0;
    let intervalId: number | null = null;

    const timeoutId = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        index += 1;
        setVisible(index);
        if (index >= text.length) {
          if (intervalId) window.clearInterval(intervalId);
          onCompleteRef.current?.();
        }
      }, speed);
    }, startDelay);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [text, speed, startDelay, reducedMotion, resetKey]);

  const display = text.slice(0, visible);
  const done = visible >= text.length;

  return (
    <span className={cn("inline", className)} aria-live="polite">
      {display}
      {showCursor && !done ? (
        <motion.span
          aria-hidden
          className="ml-0.5 inline-block w-[2px] translate-y-px bg-indigo-300"
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.85, repeat: Infinity, ease: "easeInOut" }}
          style={{ height: "1em" }}
        />
      ) : null}
    </span>
  );
}
