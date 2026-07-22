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

function extractPassportPages(children: ReactNode | undefined): ReactNode[] {
  const slides: { index: number; content: ReactNode }[] = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const type = child.type as { displayName?: string };
    if (type.displayName === "RankPassportSlide") {
      slides.push({
        index: typeof child.props.slideIndex === "number" ? child.props.slideIndex : slides.length,
        content: child.props.children,
      });
    }
  });

  return slides.sort((a, b) => a.index - b.index).map((slide) => slide.content);
}

export function RankPassport3D({
  subjectLabel,
  children,
  pages: pagesProp,
  pageCount: _pageCount,
  className,
}: RankPassport3DProps) {
  const extractedPages = useMemo(() => extractPassportPages(children), [children]);
  const pages = pagesProp ?? extractedPages;

  return (
    <PassportBookCanvasDynamic
      pages={pages}
      subjectLabel={subjectLabel}
      className={cn("rank-passport-3d-canvas-shell relative", className)}
    />
  );
}

export function RankPassportSlide({
  children,
  slideIndex,
  className,
}: {
  children: ReactNode;
  slideIndex: number;
  className?: string;
}) {
  return (
    <div className={cn("hidden", className)} aria-hidden data-passport-slide={slideIndex}>
      {children}
    </div>
  );
}

RankPassportSlide.displayName = "RankPassportSlide";
