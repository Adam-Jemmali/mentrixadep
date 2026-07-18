"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

/** Passthrough — logo cursor trail removed for performance. */
export function LandingLogoCursor({ children }: Props) {
  return children;
}
