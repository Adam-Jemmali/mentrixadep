"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { staggerFast } from "@/components/landing/v2/motion/landing-motion";
import { useLandingMotion } from "@/components/landing/v2/motion/use-landing-motion";

type Props = {
  lines: string[];
  className?: string;
  lineClassName?: string;
  /** Line index that receives premium gradient + glow */
  highlightLineIndex?: number;
  as?: "h1" | "h2" | "p";
};

const lineVariants = {
  hidden: { opacity: 0, y: 36, rotateX: -12, filter: "blur(10px)" },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    rotateX: 0,
    filter: "blur(0px)",
    transition: {
      delay: i * 0.14,
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  }),
};

export function AnimatedHeadline({
  lines,
  className,
  lineClassName,
  highlightLineIndex = 1,
  as: Tag = "h1",
}: Props) {
  const { cinematic } = useLandingMotion();
  const MotionTag = motion[Tag];

  const renderLine = (line: string, i: number) => {
    const isHighlight = i === highlightLineIndex;
    return (
      <span
        key={line}
        className={cn(
          "block",
          lineClassName,
          isHighlight && "lp-hero-headline-gradient not-italic",
        )}
      >
        {line}
      </span>
    );
  };

  if (!cinematic) {
    return (
      <Tag className={className}>
        {lines.map((line, i) => renderLine(line, i))}
      </Tag>
    );
  }

  return (
    <MotionTag
      initial="hidden"
      animate="visible"
      variants={staggerFast}
      className={className}
      style={{ perspective: 800 }}
    >
      {lines.map((line, i) => (
        <motion.span
          key={line}
          custom={i}
          variants={lineVariants}
          className={cn(
            "block origin-left",
            lineClassName,
            i === highlightLineIndex && "lp-hero-headline-gradient not-italic",
          )}
        >
          {line}
        </motion.span>
      ))}
    </MotionTag>
  );
}
