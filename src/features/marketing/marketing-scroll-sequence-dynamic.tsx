"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const ScrollSequence = dynamic(() => import("@/features/marketing/scroll-sequence-wrapper"), {
  ssr: false,
});

export type MarketingScrollSequenceDynamicProps = {
  framePath: string;
  totalFrames: number;
  height: number;
  children?: ReactNode;
  sequenceId?: string;
  fit?: "cover" | "contain";
  disableMotionSafety?: boolean;
  eagerPreload?: boolean;
};

export function MarketingScrollSequenceDynamic(props: MarketingScrollSequenceDynamicProps) {
  return <ScrollSequence {...props} />;
}
