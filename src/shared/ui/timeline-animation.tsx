"use client";

import * as React from "react";
import { useRef } from "react";
import { motion, useInView, Variants } from "framer-motion";
import { cn } from "@/shared/core/utils";

interface TimelineContentProps {
  children: React.ReactNode;
  animationNum?: number;
  timelineRef?: React.RefObject<HTMLDivElement | null>;
  customVariants?: Variants;
  className?: string;
  as?: React.ElementType;
}

const defaultVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

export const TimelineContent = ({
  children,
  animationNum = 0,
  customVariants,
  className,
  as: Component = "div",
}: TimelineContentProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-10% 0px" });

  const variants = customVariants || defaultVariants;
  
  // Use motion() to wrap the dynamic component
  // Use any to avoid "Type instantiation is excessively deep" with complex ElementType
   
  const MotionComponent = (motion as any)[Component as string] || motion(Component as any);

  return (
    <MotionComponent
      ref={ref}
      className={cn(className)}
      custom={animationNum}
      variants={variants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
    >
      {children}
    </MotionComponent>
  );
};
