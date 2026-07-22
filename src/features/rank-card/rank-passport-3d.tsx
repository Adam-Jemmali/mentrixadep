"use client";

import dynamic from "next/dynamic";
import {
  Children,
  isValidElement,
  type ReactNode,
  useMemo,
} from "react";
import { cn } from "@/shared/core/utils";

type RankPassport3DProps = {
  subjectLabel: string;
  children?: ReactNode;
  pages?: ReactNode[];
  pageCount: number;
  className?: string;
};

const PassportBookCanvasDynamic = dynamic(
  () =>
    import("@/features/rank-card/rank-passport-3d-book-canvas").then(
      (module) => module.PassportBookCanvas,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="rank-passport-3d-canvas-shell flex items-center justify-center"
        style={{ height: "min(78dvh, 720px)" }}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6366F1]">Loading passport</p>
      </div>
    ),
  },
);

function extractPassportSlides(children: ReactNode | undefined): {
  pages: ReactNode[];
  interactivePages: boolean[];
} {
  const slides: { index: number; content: ReactNode; interactive: boolean }[] = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const type = child.type as { displayName?: string };
    if (type.displayName === "RankPassportSlide") {
      slides.push({
        index: typeof child.props.slideIndex === "number" ? child.props.slideIndex : slides.length,
        content: child.props.children,
        interactive: Boolean(child.props.interactive),
      });
    }
  });

  const sorted = slides.sort((a, b) => a.index - b.index);
  return {
    pages: sorted.map((slide) => slide.content),
    interactivePages: sorted.map((slide) => slide.interactive),
  };
}

export function RankPassport3D({
  subjectLabel,
  children,
  pages: pagesProp,
  pageCount: _pageCount,
  className,
}: RankPassport3DProps) {
  const extracted = useMemo(() => extractPassportSlides(children), [children]);
  const pages = pagesProp ?? extracted.pages;
  const interactivePages = extracted.interactivePages;

  return (
    <PassportBookCanvasDynamic
      pages={pages}
      interactivePages={interactivePages}
      subjectLabel={subjectLabel}
      className={cn("rank-passport-3d-canvas-shell relative", className)}
    />
  );
}

export function RankPassportSlide({
  children,
  slideIndex,
  interactive = false,
  className,
}: {
  children: ReactNode;
  slideIndex: number;
  interactive?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("hidden", className)}
      aria-hidden
      data-passport-slide={slideIndex}
      data-passport-interactive={interactive ? "true" : undefined}
    >
      {children}
    </div>
  );
}

RankPassportSlide.displayName = "RankPassportSlide";
