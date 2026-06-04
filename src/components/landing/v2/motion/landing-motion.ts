import type { Transition, Variants } from "framer-motion";

export const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number];
export const easeOutQuart = [0.25, 1, 0.5, 1] as [number, number, number, number];

export const springSnappy = { type: "spring" as const, stiffness: 380, damping: 28, mass: 0.8 };
export const springSoft = { type: "spring" as const, stiffness: 200, damping: 26, mass: 1 };
export const springBouncy = { type: "spring" as const, stiffness: 420, damping: 18, mass: 0.7 };

export const microTransition: Transition = { duration: 0.22, ease: easeOutExpo };
export const revealTransition: Transition = { duration: 0.65, ease: easeOutExpo };

export const viewportOnce = {
  once: true,
  margin: "-8% 0px -8% 0px" as const,
};

export const viewportRepeat = {
  once: false,
  margin: "-15% 0px -15% 0px" as const,
  amount: 0.35 as const,
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40, filter: "blur(8px)" },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { delay: i * 0.09, ...revealTransition },
  }),
};

export const fadeUpLite: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.5, ease: easeOutExpo },
  }),
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.55, ease: easeOutExpo },
  },
};

export const slideFromLeft: Variants = {
  hidden: { opacity: 0, x: -48, filter: "blur(6px)" },
  visible: (i = 0) => ({
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: { delay: i * 0.08, ...revealTransition },
  }),
};

export const slideFromRight: Variants = {
  hidden: { opacity: 0, x: 48, filter: "blur(6px)" },
  visible: (i = 0) => ({
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: { delay: i * 0.08, ...revealTransition },
  }),
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.88, rotate: -2 },
  visible: (i = 0) => ({
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { delay: i * 0.06, ...revealTransition },
  }),
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.11, delayChildren: 0.08 },
  },
};

export const staggerFast: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

export const cardHoverLift = {
  y: -8,
  scale: 1.02,
  transition: springSnappy,
};

export const iconFloat = {
  y: [0, -6, 0],
  transition: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
};
