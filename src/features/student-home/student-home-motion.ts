import type { Variants } from "@/shared/animation/motion";

export const homeListContainerVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.055, delayChildren: 0.04 },
  },
};

export const homeListItemVariants: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] },
  },
};

export const homeSectionReveal = {
  y: 28,
  duration: 0.52,
  ease: "power2.out" as const,
};
