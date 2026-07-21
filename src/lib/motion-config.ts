export const SPRING_SNAPPY = { type: "spring" as const, stiffness: 500, damping: 30 };
export const SPRING_SOFT = { type: "spring" as const, stiffness: 180, damping: 22 };
export const SPRING_BOUNCY = { type: "spring" as const, stiffness: 380, damping: 18 };
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
export const EASE_OUT_QUART = [0.25, 1, 0.5, 1] as const;
