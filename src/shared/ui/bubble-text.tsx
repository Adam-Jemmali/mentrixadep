"use client";

import { useState } from "react";
import { cn } from "@/shared/core/utils";
import { useUiPerfTier } from "@/shared/core/use-ui-perf-tier";

interface BubbleTextProps {
  text: string;
  className?: string;
  activeColor?: string;
  neighborColor?: string;
}

export const BubbleText = ({ 
  text, 
  className,
  activeColor = "text-white",
  neighborColor = "text-white/70"
}: BubbleTextProps) => {
  const tier = useUiPerfTier();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (tier === "lite") {
    return <span className={cn("inline-flex font-medium", className)}>{text}</span>;
  }

  return (
    <span
      // Reset the hovered index when the mouse leaves the entire text container.
      onMouseLeave={() => setHoveredIndex(null)}
      className={cn("inline-flex", className)}
    >
      {text.split("").map((char, idx) => {
        // Calculate the distance from the currently hovered character.
        const distance = hoveredIndex !== null ? Math.abs(hoveredIndex - idx) : null;
        
        // Base classes for all characters, including the transition effect.
        let classes = "transition-all duration-300 ease-in-out cursor-pointer inline-block";
        
        // Apply different styles based on the distance from the hovered character.
        switch (distance) {
          case 0: // The character being hovered over.
            classes += ` font-black scale-125 origin-bottom ${activeColor}`;
            break;
          case 1: // Immediate neighbors.
            classes += ` font-bold scale-110 origin-bottom ${neighborColor}`;
            break;
          case 2: // Second-degree neighbors.
            classes += " font-medium"; 
            break;
          default:
            classes += " font-normal";
            break;
        }

        return (
          <span
            key={idx}
            // Update the state with the index of the character being hovered.
            onMouseEnter={() => setHoveredIndex(idx)}
            className={classes}
          >
            {/* Use a non-breaking space for space characters to prevent collapsing */}
            {char === " " ? "\u00A0" : char}
          </span>
        );
      })}
    </span>
  );
};
