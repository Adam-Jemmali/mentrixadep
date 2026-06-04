"use client";

import type { ReactNode } from "react";
import { MentrixaCursor } from "@/components/ui/tech-cursor";

type Props = {
  children: ReactNode;
  className?: string;
};

export function LandingLogoCursor({ children, className }: Props) {
  return <MentrixaCursor className={className}>{children}</MentrixaCursor>;
}
